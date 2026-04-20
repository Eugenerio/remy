import { Queue, QueueEvents, Worker, type Job as BullJob } from 'bullmq';
import { redis } from '../redis.js';
import { logger } from '../logger.js';
import { env } from '../env.js';
import type { JobKind } from '@remy/shared/jobs';

export const QUEUES = {
  lora: 'lora',
  generation: 'generation',
  trends: 'trends',
  preprocessing: 'preprocessing',
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

const connection = { connection: redis };

const queues = new Map<QueueName, Queue>();
export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      ...connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 60 * 60, count: 1000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    });
    queues.set(name, q);
  }
  return q;
}

export interface JobDispatchPayload {
  job_id: string;
  kind: JobKind;
  user_id: string;
  input: Record<string, unknown>;
}

export async function enqueueJob(queue: QueueName, payload: JobDispatchPayload): Promise<void> {
  await getQueue(queue).add(payload.kind, payload, {
    jobId: payload.job_id,
    attempts: 3,
  });
}

/**
 * Worker helper — the real work is "call AI service with this payload".
 * We keep the worker logic trivial: the AI service is idempotent on
 * external_job_id, so retries are safe.
 */
export function startDispatchWorker(queue: QueueName): Worker {
  const worker = new Worker(
    queue,
    async (job: BullJob<JobDispatchPayload>) => {
      const { data } = job;
      logger.info({ queue, job_id: data.job_id, kind: data.kind }, 'dispatching to ai');
      const res = await fetch(`${env.PUBLIC_AI_URL}/internal/jobs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-remy-token': env.INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI service ${res.status}: ${text}`);
      }
      return await res.json();
    },
    { ...connection, concurrency: 8 },
  );

  worker.on('failed', (job, err) => {
    logger.error({ queue, job_id: job?.id, err }, 'dispatch worker failed');
  });

  return worker;
}

export const queueEvents = new Map<QueueName, QueueEvents>();
