/**
 * Error codes are part of the public API contract. Clients switch on code,
 * not on message, so renaming these is a breaking change.
 */
export const ERROR_CODES = {
  UNAUTHENTICATED: 'unauthenticated',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  VALIDATION: 'validation',
  INSUFFICIENT_CREDITS: 'insufficient_credits',
  RATE_LIMITED: 'rate_limited',
  PAYMENT_REQUIRED: 'payment_required',
  CONFLICT: 'conflict',
  JOB_FAILED: 'job_failed',
  UPSTREAM_UNAVAILABLE: 'upstream_unavailable',
  INTERNAL: 'internal',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiErrorShape {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    request_id?: string;
  };
}

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toJSON(request_id?: string): ApiErrorShape {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        request_id,
      },
    };
  }
}

export const errors = {
  unauthenticated: (msg = 'Authentication required') => new ApiError('unauthenticated', msg, 401),
  forbidden: (msg = 'Forbidden') => new ApiError('forbidden', msg, 403),
  notFound: (msg = 'Not found') => new ApiError('not_found', msg, 404),
  validation: (msg: string, details?: unknown) => new ApiError('validation', msg, 422, details),
  insufficientCredits: (need: number, have: number) =>
    new ApiError(
      'insufficient_credits',
      `Not enough credits: need ${need}, have ${have}`,
      402,
      { need, have },
    ),
  rateLimited: (msg = 'Too many requests') => new ApiError('rate_limited', msg, 429),
  paymentRequired: (msg = 'Payment required') => new ApiError('payment_required', msg, 402),
  conflict: (msg: string) => new ApiError('conflict', msg, 409),
  jobFailed: (msg: string, details?: unknown) => new ApiError('job_failed', msg, 500, details),
  upstreamUnavailable: (msg = 'Upstream unavailable') =>
    new ApiError('upstream_unavailable', msg, 503),
  internal: (msg = 'Internal server error') => new ApiError('internal', msg, 500),
};
