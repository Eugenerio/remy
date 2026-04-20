import { describe, it, expect } from 'vitest';
import { errors, ApiError } from './errors';

describe('errors factory', () => {
  it('produces canonical shape for insufficient credits', () => {
    const e = errors.insufficientCredits(50, 10);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.code).toBe('insufficient_credits');
    expect(e.status).toBe(402);
    const j = e.toJSON('req_x');
    expect(j.error.code).toBe('insufficient_credits');
    expect(j.error.details).toEqual({ need: 50, have: 10 });
    expect(j.error.request_id).toBe('req_x');
  });
  it('defaults unauthenticated to 401', () => {
    expect(errors.unauthenticated().status).toBe(401);
  });
});
