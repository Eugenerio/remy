import type { MiddlewareHandler } from 'hono';
import { errors } from '@remy/shared/errors';
import { redis } from '../redis.js';
import type { AppEnv } from '../context.js';

interface RateLimitOpts {
  key: (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => string;
  windowSeconds: number;
  max: number;
}

/**
 * Sliding-window rate limiter backed by Redis. Uses atomic INCR + EXPIRE.
 * For MVP we don't bother with leaky-bucket; precision at the second level
 * is plenty.
 */
export function rateLimit(opts: RateLimitOpts): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const key = `rl:${opts.key(c)}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, opts.windowSeconds);
    if (count > opts.max) throw errors.rateLimited();
    await next();
  };
}
