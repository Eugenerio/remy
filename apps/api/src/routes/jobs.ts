import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { streamSSE } from 'hono/streaming';
import { jobListQuerySchema } from '@remy/shared/schemas';
import { isTerminal, type JobStatus } from '@remy/shared/jobs';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { CreditsService, settleJobCredits } from '../services/credits.js';

export const jobRoutes = new Hono<AppEnv>();

jobRoutes.get('/', zValidator('query', jobListQuerySchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const q = c.req.valid('query');

  const items = await prisma.job.findMany({
    where: {
      userId: user.id,
      kind: q.kind,
      status: q.status,
      characterId: q.character_id,
      ...(q.cursor ? { createdAt: { lt: new Date(q.cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: q.limit + 1,
    include: {
      character: { select: { id: true, name: true } },
      generation: { select: { id: true, outputVideoKey: true, outputThumbnailKey: true, decision: true } },
    },
  });

  const hasMore = items.length > q.limit;
  const page = items.slice(0, q.limit);
  const nextCursor = hasMore ? page[page.length - 1]!.createdAt.toISOString() : null;

  return c.json({ items: page, next_cursor: nextCursor });
});

jobRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const job = await prisma.job.findFirst({
    where: { id: c.req.param('id'), userId: user.id },
    include: {
      character: { select: { id: true, name: true } },
      generation: true,
    },
  });
  if (!job) throw errors.notFound('Job');
  return c.json(job);
});

jobRoutes.get('/:id/stream', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');

  return streamSSE(c, async (stream) => {
    let lastPayload = '';
    for (let tick = 0; tick < 60 * 30; tick++) {
      const job = await prisma.job.findFirst({
        where: { id, userId: user.id },
        select: { id: true, status: true, progress: true, error: true, updatedAt: true, output: true },
      });
      if (!job) {
        await stream.writeSSE({ event: 'error', data: 'not_found' });
        return;
      }
      const payload = JSON.stringify(job);
      if (payload !== lastPayload) {
        await stream.writeSSE({ event: 'job', data: payload });
        lastPayload = payload;
      }
      if (isTerminal(job.status as JobStatus)) {
        await stream.writeSSE({ event: 'terminal', data: payload });
        return;
      }
      await stream.sleep(1_000);
    }
  });
});

jobRoutes.post('/:id/cancel', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');
  const job = await prisma.job.findFirst({ where: { id, userId: user.id } });
  if (!job) throw errors.notFound('Job');
  if (isTerminal(job.status as JobStatus)) {
    return c.json({ ok: true, already_terminal: true });
  }
  if (['running', 'rendering', 'uploading'].includes(job.status)) {
    throw errors.conflict('Cannot cancel a job that is already running');
  }
  await prisma.$transaction(async (tx) => {
    const credits = new CreditsService(tx);
    await credits.cancelReservation({
      userId: user.id,
      reservationTxId: job.reservationTxId,
      reservedAmount: job.reservedCredits,
    });
    await tx.job.update({
      where: { id: job.id },
      data: { status: 'cancelled', finishedAt: new Date(), refundedCredits: job.reservedCredits },
    });
  });
  return c.json({ ok: true });
});

/**
 * Admin/debug only: re-run settle logic in case a webhook dropped.
 */
jobRoutes.post('/:id/settle', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');
  const job = await prisma.job.findFirst({ where: { id, userId: user.id } });
  if (!job) throw errors.notFound('Job');
  if (!isTerminal(job.status as JobStatus)) {
    throw errors.conflict('Job is not in terminal state');
  }
  await settleJobCredits(prisma, { jobId: job.id, finalStatus: job.status as JobStatus });
  return c.json({ ok: true });
});
