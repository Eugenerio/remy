import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { trendSourceCreateSchema, suggestedVideoRankSchema } from '@remy/shared/schemas';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { enqueueJob } from '../services/queue.js';

export const trendsRoutes = new Hono<AppEnv>();

trendsRoutes.get('/sources', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const sources = await prisma.trendSource.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { suggestedVideos: true } } },
  });
  return c.json({
    items: sources.map((s) => ({
      id: s.id,
      kind: s.kind,
      handle: s.handle,
      label: s.label ?? s.handle,
      active: s.active,
      video_count: s._count.suggestedVideos,
      last_ingest_at: s.lastIngestAt,
      created_at: s.createdAt,
    })),
  });
});

trendsRoutes.post('/sources', zValidator('json', trendSourceCreateSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const body = c.req.valid('json');
  try {
    const source = await prisma.trendSource.create({
      data: {
        userId: user.id,
        kind: body.kind,
        handle: body.handle,
        label: body.label ?? body.handle,
      },
    });
    // Kick off initial ingest immediately; no credits charged.
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        kind: 'trend_ingest',
        status: 'queued',
        input: { source_id: source.id, kind: source.kind, handle: source.handle },
      },
    });
    await enqueueJob('trends', {
      job_id: job.id,
      kind: 'trend_ingest',
      user_id: user.id,
      input: { source_id: source.id, kind: source.kind, handle: source.handle },
    });
    return c.json(source, 201);
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') throw errors.conflict('Already tracking');
    throw e;
  }
});

trendsRoutes.delete('/sources/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');
  await prisma.trendSource.deleteMany({ where: { id, userId: user.id } });
  return c.json({ ok: true });
});

trendsRoutes.get('/suggested', zValidator('query', suggestedVideoRankSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const q = c.req.valid('query');

  const items = await prisma.suggestedVideo.findMany({
    where: {
      source: { userId: user.id },
      engagementScore: { gte: q.min_engagement },
      ...(q.simple_only ? { simplicityScore: { gte: 0.55 } } : {}),
    },
    orderBy: { rankScore: 'desc' },
    take: q.limit,
    include: { source: { select: { handle: true, label: true, kind: true } } },
  });

  return c.json({
    items: items.map((v) => ({
      id: v.id,
      source: v.source,
      url: v.url,
      thumbnail_url: v.thumbnailUrl,
      creator_handle: v.creatorHandle,
      caption: v.caption,
      duration_seconds: v.durationSeconds,
      engagement_score: v.engagementScore,
      simplicity_score: v.simplicityScore,
      rank_score: v.rankScore,
      published_at: v.publishedAt,
    })),
  });
});
