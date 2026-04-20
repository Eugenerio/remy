import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { requireInternalToken } from '../middleware/auth.js';
import { signedDownload } from '../services/storage.js';

export const internalRoutes = new Hono<AppEnv>();

internalRoutes.use('*', requireInternalToken);

const downloadQuery = z.object({
  bucket: z.enum(['uploads', 'generations', 'datasets']),
  key: z.string().min(1),
});

/** Sign a download URL the AI service can use to fetch a user asset. */
internalRoutes.get('/storage/download', async (c) => {
  const parsed = downloadQuery.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) throw errors.validation('Invalid query');
  const url = await signedDownload({ bucket: parsed.data.bucket, key: parsed.data.key });
  return c.json({ url });
});

/** Dehydrated job view for the AI service — includes reservation details. */
internalRoutes.get('/jobs/:id', async (c) => {
  const job = await prisma.job.findUnique({ where: { id: c.req.param('id') } });
  if (!job) throw errors.notFound('Job');
  return c.json(job);
});

/** AI service posts back the ranked trending videos after a `trend_ingest` job. */
const trendResultSchema = z.object({
  source_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        platform_id: z.string(),
        url: z.string(),
        thumbnail_url: z.string().nullish(),
        creator_handle: z.string().nullish(),
        caption: z.string().nullish(),
        duration_seconds: z.number().int().nullish(),
        like_count: z.number().int().nullish(),
        view_count: z.number().int().nullish(),
        share_count: z.number().int().nullish(),
        comment_count: z.number().int().nullish(),
        engagement_score: z.number(),
        simplicity_score: z.number(),
        rank_score: z.number(),
        published_at: z.string().datetime().nullish(),
      }),
    )
    .max(500),
});

internalRoutes.post('/trends/ingest-result', zValidator('json', trendResultSchema), async (c) => {
  const body = c.req.valid('json');
  const source = await prisma.trendSource.findUnique({ where: { id: body.source_id } });
  if (!source) throw errors.notFound('Trend source');

  const now = new Date();
  for (const item of body.items) {
    await prisma.suggestedVideo.upsert({
      where: { sourceId_platformId: { sourceId: source.id, platformId: item.platform_id } },
      create: {
        sourceId: source.id,
        platformId: item.platform_id,
        url: item.url,
        thumbnailUrl: item.thumbnail_url ?? null,
        creatorHandle: item.creator_handle ?? null,
        caption: item.caption ?? null,
        durationSeconds: item.duration_seconds ?? null,
        likeCount: item.like_count ?? null,
        viewCount: item.view_count ?? null,
        shareCount: item.share_count ?? null,
        commentCount: item.comment_count ?? null,
        engagementScore: item.engagement_score,
        simplicityScore: item.simplicity_score,
        rankScore: item.rank_score,
        publishedAt: item.published_at ? new Date(item.published_at) : null,
      },
      update: {
        engagementScore: item.engagement_score,
        simplicityScore: item.simplicity_score,
        rankScore: item.rank_score,
        thumbnailUrl: item.thumbnail_url ?? undefined,
        caption: item.caption ?? undefined,
        durationSeconds: item.duration_seconds ?? undefined,
        likeCount: item.like_count ?? undefined,
        viewCount: item.view_count ?? undefined,
        shareCount: item.share_count ?? undefined,
        commentCount: item.comment_count ?? undefined,
      },
    });
  }

  await prisma.trendSource.update({
    where: { id: source.id },
    data: { lastIngestAt: now },
  });

  return c.json({ ok: true, ingested: body.items.length });
});
