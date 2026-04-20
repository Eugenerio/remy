import type { MiddlewareHandler } from 'hono';
import { nanoid } from 'nanoid';
import type { AppEnv } from '../context.js';

export const requestIdMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const id = incoming ?? `req_${nanoid(18)}`;
  c.set('requestId', id);
  c.set('startedAt', Date.now());
  c.header('x-request-id', id);
  await next();
};
