import IORedis, { type RedisOptions } from 'ioredis';
import { env } from './env.js';

const redisGlobal = globalThis as unknown as { redis?: IORedis };

// Upstash (rediss://) requires TLS and doesn't play well with BullMQ's
// default `enableReadyCheck`. We disable both ready-check and per-request
// retries — BullMQ's docs explicitly require these settings.
const isTls = env.REDIS_URL.startsWith('rediss://');
const options: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  ...(isTls ? { tls: {} } : {}),
};

export const redis = redisGlobal.redis ?? new IORedis(env.REDIS_URL, options);

if (env.NODE_ENV !== 'production') {
  redisGlobal.redis = redis;
}
