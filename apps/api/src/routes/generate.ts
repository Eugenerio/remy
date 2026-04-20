import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { generateVideoSchema } from '@remy/shared/schemas';
import { errors } from '@remy/shared/errors';
import { CREDIT_COSTS } from '@remy/shared/credits';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { CreditsService } from '../services/credits.js';
import { enqueueJob } from '../services/queue.js';

export const generateRoutes = new Hono<AppEnv>();

function videoCost(duration: 5 | 10 | 15): number {
  return duration <= 5 ? CREDIT_COSTS.VIDEO_GENERATION_SHORT : CREDIT_COSTS.VIDEO_GENERATION_LONG;
}

generateRoutes.post('/estimate', zValidator('json', generateVideoSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const body = c.req.valid('json');

  const [character, balance] = await Promise.all([
    prisma.character.findFirst({
      where: { id: body.character_id, userId: user.id, archived: false },
      include: { activeLora: true },
    }),
    new CreditsService().getBalance(user.id),
  ]);
  if (!character) throw errors.notFound('Character');
  const warnings: string[] = [];
  if (!character.activeLora || character.activeLora.status !== 'ready') {
    warnings.push('Character LoRA is not ready yet — generation will fail until training completes.');
  }

  const cost = videoCost(body.duration_seconds);
  return c.json({
    cost,
    balance: balance.available,
    sufficient: balance.available >= cost,
    warnings,
    estimated_minutes: body.duration_seconds <= 5 ? [2, 4] : [4, 8],
  });
});

generateRoutes.post('/', zValidator('json', generateVideoSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const body = c.req.valid('json');

  const character = await prisma.character.findFirst({
    where: { id: body.character_id, userId: user.id, archived: false },
    include: { activeLora: true },
  });
  if (!character) throw errors.notFound('Character');
  if (!character.activeLora || character.activeLora.status !== 'ready') {
    throw errors.conflict('Character LoRA is not ready');
  }

  const cost = videoCost(body.duration_seconds);
  if (body.confirm_credit_cost !== cost) {
    throw errors.conflict('Cost changed since estimate — please refresh');
  }

  let referenceVideoUrl = body.reference_video_url;
  if (body.suggested_video_id && !referenceVideoUrl) {
    const sv = await prisma.suggestedVideo.findFirst({
      where: { id: body.suggested_video_id, source: { userId: user.id } },
    });
    if (!sv) throw errors.notFound('Suggested video');
    referenceVideoUrl = sv.url;
  }
  if (!referenceVideoUrl) throw errors.validation('reference_video_url or suggested_video_id required');

  const result = await prisma.$transaction(
    async (tx) => {
      const credits = new CreditsService(tx);
      const job = await tx.job.create({
        data: {
          userId: user.id,
          characterId: character.id,
          kind: 'video_generation',
          status: 'reserved',
          input: {
            character_id: character.id,
            lora_weights_key: character.activeLora!.weightsKey,
            reference_video_url: referenceVideoUrl,
            duration_seconds: body.duration_seconds,
            resolution: body.resolution,
            seed: body.seed ?? null,
            outfit_override: body.outfit_override ?? null,
          },
        },
      });
      const { transactionId, cost: reserved } = await credits.reserve({
        userId: user.id,
        action: body.duration_seconds <= 5 ? 'VIDEO_GENERATION_SHORT' : 'VIDEO_GENERATION_LONG',
        referenceKind: 'Job',
        referenceId: job.id,
      });
      await tx.job.update({
        where: { id: job.id },
        data: { reservedCredits: reserved, reservationTxId: transactionId, status: 'queued' },
      });
      await tx.generation.create({
        data: {
          userId: user.id,
          characterId: character.id,
          jobId: job.id,
          suggestedVideoId: body.suggested_video_id ?? null,
          referenceVideoUrl,
          durationSeconds: body.duration_seconds,
          resolution: body.resolution,
          seed: body.seed ? BigInt(body.seed) : null,
          outfitPrompt: body.outfit_override ?? null,
        },
      });
      return { jobId: job.id };
    },
    { isolationLevel: 'Serializable' },
  );

  await enqueueJob('generation', {
    job_id: result.jobId,
    kind: 'video_generation',
    user_id: user.id,
    input: {
      character_id: character.id,
      reference_video_url: referenceVideoUrl,
      duration_seconds: body.duration_seconds,
      resolution: body.resolution,
    },
  });

  return c.json({ job_id: result.jobId, reserved_credits: cost }, 201);
});

generateRoutes.post('/:id/approve', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const gen = await prisma.generation.findFirst({
    where: { id: c.req.param('id'), userId: user.id },
  });
  if (!gen) throw errors.notFound('Generation');
  const updated = await prisma.generation.update({
    where: { id: gen.id },
    data: { decision: 'approved', decidedAt: new Date() },
  });
  return c.json(updated);
});

generateRoutes.post('/:id/discard', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const gen = await prisma.generation.findFirst({
    where: { id: c.req.param('id'), userId: user.id },
  });
  if (!gen) throw errors.notFound('Generation');
  const updated = await prisma.generation.update({
    where: { id: gen.id },
    data: { decision: 'discarded', decidedAt: new Date() },
  });
  return c.json(updated);
});

generateRoutes.post('/:id/regenerate', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const gen = await prisma.generation.findFirst({
    where: { id: c.req.param('id'), userId: user.id },
    include: { character: { include: { activeLora: true } } },
  });
  if (!gen || !gen.referenceVideoUrl) throw errors.notFound('Generation');

  const result = await prisma.$transaction(
    async (tx) => {
      const credits = new CreditsService(tx);
      const job = await tx.job.create({
        data: {
          userId: user.id,
          characterId: gen.characterId,
          kind: 'video_regeneration',
          status: 'reserved',
          input: {
            previous_generation_id: gen.id,
            reference_video_url: gen.referenceVideoUrl,
            duration_seconds: gen.durationSeconds,
            resolution: gen.resolution,
            outfit_override: gen.outfitPrompt,
          },
        },
      });
      const { transactionId, cost } = await credits.reserve({
        userId: user.id,
        action: 'VIDEO_REGENERATION',
        referenceKind: 'Job',
        referenceId: job.id,
      });
      await tx.job.update({
        where: { id: job.id },
        data: { reservedCredits: cost, reservationTxId: transactionId, status: 'queued' },
      });
      await tx.generation.update({
        where: { id: gen.id },
        data: { decision: 'regenerated', decidedAt: new Date() },
      });
      return { jobId: job.id, cost };
    },
    { isolationLevel: 'Serializable' },
  );

  await enqueueJob('generation', {
    job_id: result.jobId,
    kind: 'video_regeneration',
    user_id: user.id,
    input: {
      previous_generation_id: gen.id,
      reference_video_url: gen.referenceVideoUrl,
      duration_seconds: gen.durationSeconds,
      resolution: gen.resolution,
    },
  });

  return c.json({ job_id: result.jobId, reserved_credits: result.cost });
});
