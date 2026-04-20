import { describe, it, expect } from 'vitest';

describe('env', () => {
  it('parses once and exposes required fields', async () => {
    const { env } = await import('../src/env.js');
    expect(env.NODE_ENV).toBe('test');
    expect(env.INTERNAL_SERVICE_TOKEN.length).toBeGreaterThanOrEqual(16);
    expect(Array.isArray(env.ADMIN_EMAILS)).toBe(true);
  });
});
