import { describe, it, expect } from 'vitest';
import { signBody, verifySignature } from '../src/services/hmac.js';

describe('hmac sign/verify', () => {
  it('verifies a body we just signed', () => {
    const body = JSON.stringify({ a: 1, b: 'x' });
    const sig = signBody(body);
    expect(verifySignature(body, sig)).toBe(true);
  });

  it('rejects a mismatched body', () => {
    const body = JSON.stringify({ a: 1 });
    const sig = signBody(body);
    expect(verifySignature(JSON.stringify({ a: 2 }), sig)).toBe(false);
  });

  it('rejects a missing signature', () => {
    const body = JSON.stringify({ a: 1 });
    expect(verifySignature(body, undefined)).toBe(false);
  });
});
