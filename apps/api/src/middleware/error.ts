import type { ErrorHandler } from 'hono';
import { ApiError } from '@remy/shared/errors';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import type { AppEnv } from '../context.js';

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  const requestId = c.get('requestId');

  if (err instanceof ApiError) {
    return c.json(err.toJSON(requestId), err.status as 400);
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'validation',
          message: 'Invalid request body',
          details: err.issues,
          request_id: requestId,
        },
      },
      422,
    );
  }

  logger.error({ err, request_id: requestId }, 'unhandled error');
  return c.json(
    {
      error: {
        code: 'internal',
        message: 'Internal server error',
        request_id: requestId,
      },
    },
    500,
  );
};
