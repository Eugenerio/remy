import { Hono } from 'hono';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { signedDownload } from '../services/storage.js';

export const libraryRoutes = new Hono<AppEnv>();

libraryRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();

  const url = new URL(c.req.url);
  const character = url.searchParams.get('character');
  const decision = url.searchParams.get('decision');
  const limit = Number(url.searchParams.get('limit') ?? '24');

  const gens = await prisma.generation.findMany({
    where: {
      userId: user.id,
      ...(character ? { characterId: character } : {}),
      ...(decision ? { decision: decision as 'pending' | 'approved' | 'discarded' | 'regenerated' } : {}),
      outputVideoKey: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    include: {
      character: { select: { id: true, name: true } },
      job: { select: { id: true, status: true } },
    },
  });

  const items = await Promise.all(
    gens.map(async (g) => ({
      id: g.id,
      character: g.character,
      duration_seconds: g.durationSeconds,
      resolution: g.resolution,
      decision: g.decision,
      created_at: g.createdAt,
      video_url: g.outputVideoKey
        ? await signedDownload({ bucket: 'generations', key: g.outputVideoKey })
        : null,
      thumbnail_url: g.outputThumbnailKey
        ? await signedDownload({ bucket: 'generations', key: g.outputThumbnailKey })
        : null,
      reference_video_url: g.referenceVideoUrl,
    })),
  );

  return c.json({ items });
});
