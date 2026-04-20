import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  characterCreateSchema,
  characterUpdateSchema,
  addReferenceImagesSchema,
  removeReferenceImageSchema,
} from '@remy/shared/schemas';
import { errors } from '@remy/shared/errors';
import type { AppEnv } from '../context.js';
import { prisma } from '../db.js';
import { CreditsService } from '../services/credits.js';
import { enqueueJob } from '../services/queue.js';
import { signedDownload } from '../services/storage.js';

const MAX_REFERENCES = 40;

export const characterRoutes = new Hono<AppEnv>();

characterRoutes.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const characters = await prisma.character.findMany({
    where: { userId: user.id, archived: false },
    orderBy: { createdAt: 'desc' },
    include: {
      dataset: true,
      activeLora: true,
      _count: { select: { generations: true } },
    },
  });
  return c.json({
    items: characters.map((ch) => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      status: ch.activeLora?.status === 'ready' ? 'ready' : ch.activeLora?.status ?? 'new',
      image_count: ch.dataset?.imageCount ?? 0,
      generation_count: ch._count.generations,
      created_at: ch.createdAt,
      updated_at: ch.updatedAt,
    })),
  });
});

characterRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const ch = await prisma.character.findFirst({
    where: { id: c.req.param('id'), userId: user.id },
    include: {
      dataset: true,
      activeLora: true,
      loras: { orderBy: { version: 'desc' } },
      jobs: {
        where: { kind: 'lora_training' },
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
      _count: { select: { generations: true } },
    },
  });
  if (!ch) throw errors.notFound('Character');

  // Sign upload URLs so the client can render the face + references. URLs
  // are cached in-process (see storage.ts) so polling doesn't re-sign.
  // References are served as 480-square thumbnails via Supabase image
  // transforms — much smaller payloads for the gallery grid.
  let faceImageUrl: string | null = null;
  let referenceImageUrls: string[] = [];
  if (ch.dataset) {
    if (ch.dataset.faceImageKey) {
      faceImageUrl = await signedDownload({
        bucket: 'uploads',
        key: ch.dataset.faceImageKey,
        ttlSeconds: 3600,
        transform: { width: 640, height: 640, resize: 'cover', quality: 80 },
      }).catch(() => null);
    }
    referenceImageUrls = await Promise.all(
      ch.dataset.referenceImageKeys.map((k) =>
        signedDownload({
          bucket: 'uploads',
          key: k,
          ttlSeconds: 3600,
          transform: { width: 480, height: 480, resize: 'cover', quality: 75 },
        }).catch(() => ''),
      ),
    );
    referenceImageUrls = referenceImageUrls.filter(Boolean);
  }

  return c.json({
    ...ch,
    generation_count: ch._count.generations,
    dataset: ch.dataset
      ? {
          ...ch.dataset,
          faceImageUrl,
          referenceImageUrls,
        }
      : null,
  });
});

characterRoutes.post('/', zValidator('json', characterCreateSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const body = c.req.valid('json');

  // One atomic transaction: Character + Dataset + Job + credit reservation
  // all succeed or all roll back. Previously these were two transactions —
  // if the second (credit reservation) failed, we left orphan characters.
  const result = await prisma.$transaction(
    async (tx) => {
      const character = await tx.character.create({
        data: {
          userId: user.id,
          name: body.name,
          description: body.description ?? null,
        },
      });
      const dataset = await tx.characterDataset.create({
        data: {
          characterId: character.id,
          faceImageKey: body.faceImageKey,
          referenceImageKeys: body.referenceImageKeys,
          imageCount: body.referenceImageKeys.length + 1,
          status: 'pending',
        },
      });
      await tx.character.update({
        where: { id: character.id },
        data: { datasetId: dataset.id },
      });

      const credits = new CreditsService(tx);
      const job = await tx.job.create({
        data: {
          userId: user.id,
          characterId: character.id,
          kind: 'lora_training',
          status: 'reserved',
          input: {
            character_id: character.id,
            dataset_id: dataset.id,
            face_image_key: body.faceImageKey,
            reference_image_keys: body.referenceImageKeys,
          },
        },
      });
      const { transactionId, cost } = await credits.reserve({
        userId: user.id,
        action: 'LORA_TRAINING',
        referenceKind: 'Job',
        referenceId: job.id,
      });
      await tx.job.update({
        where: { id: job.id },
        data: { reservedCredits: cost, reservationTxId: transactionId, status: 'queued' },
      });
      return { characterId: character.id, datasetId: dataset.id, jobId: job.id, cost };
    },
    { isolationLevel: 'Serializable' },
  );

  await enqueueJob('lora', {
    job_id: result.jobId,
    kind: 'lora_training',
    user_id: user.id,
    input: {
      character_id: result.characterId,
      dataset_id: result.datasetId,
      face_image_key: body.faceImageKey,
      reference_image_keys: body.referenceImageKeys,
    },
  });

  return c.json(
    {
      id: result.characterId,
      training_job_id: result.jobId,
      reserved_credits: result.cost,
    },
    201,
  );
});

characterRoutes.patch('/:id', zValidator('json', characterUpdateSchema), async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');
  const owned = await prisma.character.findFirst({ where: { id, userId: user.id } });
  if (!owned) throw errors.notFound('Character');
  const body = c.req.valid('json');
  const updated = await prisma.character.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      archived: body.archived,
    },
  });
  return c.json(updated);
});

characterRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');

  // Before deleting: cancel any outstanding reservations so we don't
  // leak pending credits. We do this in a serializable tx so a concurrent
  // webhook can't race us.
  await prisma.$transaction(
    async (tx) => {
      const jobs = await tx.job.findMany({
        where: {
          characterId: id,
          userId: user.id,
          reservationTxId: { not: null },
          status: { in: ['queued', 'reserved', 'preparing'] },
        },
      });
      const credits = new CreditsService(tx);
      for (const j of jobs) {
        await credits.cancelReservation({
          userId: user.id,
          reservationTxId: j.reservationTxId,
          reservedAmount: j.reservedCredits,
        });
        await tx.job.update({
          where: { id: j.id },
          data: { status: 'cancelled', finishedAt: new Date() },
        });
      }

      const deleted = await tx.character.deleteMany({ where: { id, userId: user.id } });
      if (deleted.count === 0) throw errors.notFound('Character');
    },
    { isolationLevel: 'Serializable' },
  );
  return c.json({ ok: true });
});

characterRoutes.post(
  '/:id/references',
  zValidator('json', addReferenceImagesSchema),
  async (c) => {
    const user = c.get('user');
    if (!user) throw errors.unauthenticated();
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const ch = await prisma.character.findFirst({
      where: { id, userId: user.id },
      include: { dataset: true },
    });
    if (!ch || !ch.dataset) throw errors.notFound('Character');

    const current = ch.dataset.referenceImageKeys;
    const combined = [...current];
    for (const k of body.referenceImageKeys) {
      if (!combined.includes(k)) combined.push(k);
    }
    if (combined.length > MAX_REFERENCES) {
      throw errors.validation(
        `Too many references: ${combined.length} > ${MAX_REFERENCES}`,
      );
    }

    const updated = await prisma.characterDataset.update({
      where: { id: ch.dataset.id },
      data: {
        referenceImageKeys: combined,
        imageCount: combined.length + (ch.dataset.faceImageKey ? 1 : 0),
      },
    });

    return c.json({
      ok: true,
      reference_image_keys: updated.referenceImageKeys,
      image_count: updated.imageCount,
      retraining_recommended: ch.activeLora?.status === 'ready',
    });
  },
);

characterRoutes.delete(
  '/:id/references',
  zValidator('json', removeReferenceImageSchema),
  async (c) => {
    const user = c.get('user');
    if (!user) throw errors.unauthenticated();
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const ch = await prisma.character.findFirst({
      where: { id, userId: user.id },
      include: { dataset: true },
    });
    if (!ch || !ch.dataset) throw errors.notFound('Character');

    const remaining = ch.dataset.referenceImageKeys.filter(
      (k) => k !== body.referenceImageKey,
    );
    if (remaining.length === ch.dataset.referenceImageKeys.length) {
      throw errors.notFound('Reference image');
    }

    const updated = await prisma.characterDataset.update({
      where: { id: ch.dataset.id },
      data: {
        referenceImageKeys: remaining,
        imageCount: remaining.length + (ch.dataset.faceImageKey ? 1 : 0),
      },
    });

    return c.json({
      ok: true,
      reference_image_keys: updated.referenceImageKeys,
      image_count: updated.imageCount,
    });
  },
);

characterRoutes.post('/:id/retrain', async (c) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const id = c.req.param('id');
  const ch = await prisma.character.findFirst({
    where: { id, userId: user.id },
    include: { dataset: true },
  });
  if (!ch || !ch.dataset) throw errors.notFound('Character');

  const training = await prisma.$transaction(
    async (tx) => {
      const credits = new CreditsService(tx);
      const job = await tx.job.create({
        data: {
          userId: user.id,
          characterId: ch.id,
          kind: 'lora_training',
          status: 'reserved',
          input: {
            character_id: ch.id,
            dataset_id: ch.dataset!.id,
          },
        },
      });
      const { transactionId, cost } = await credits.reserve({
        userId: user.id,
        action: 'LORA_TRAINING',
        referenceKind: 'Job',
        referenceId: job.id,
      });
      await tx.job.update({
        where: { id: job.id },
        data: { reservedCredits: cost, reservationTxId: transactionId, status: 'queued' },
      });
      return { jobId: job.id };
    },
    { isolationLevel: 'Serializable' },
  );

  await enqueueJob('lora', {
    job_id: training.jobId,
    kind: 'lora_training',
    user_id: user.id,
    input: {
      character_id: ch.id,
      dataset_id: ch.dataset.id,
      face_image_key: ch.dataset.faceImageKey,
      reference_image_keys: ch.dataset.referenceImageKeys,
    },
  });

  return c.json({ training_job_id: training.jobId });
});
