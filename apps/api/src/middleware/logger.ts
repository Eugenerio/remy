import type { MiddlewareHandler } from 'hono';
import { logger } from '../logger.js';
import type { AppEnv } from '../context.js';

export const loggerMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  const ms = Date.now() - (c.get('startedAt') ?? Date.now());
  const route = new URL(c.req.url).pathname;
  logger.info(
    {
      request_id: c.get('requestId'),
      method: c.req.method,
      route,
      status: c.res.status,
      duration_ms: ms,
      user_id: c.get('user')?.id,
    },
    'http',
  );
};
