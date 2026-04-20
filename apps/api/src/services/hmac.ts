import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

/**
 * Sign/verify arbitrary JSON payloads between services (AI→API, Modal→API).
 * Stripe webhooks use Stripe's own signing — this is only for internal hops.
 */
export function signBody(body: string, secret = env.INTERNAL_SERVICE_TOKEN): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

export function verifySignature(
  body: string,
  signature: string | undefined,
  secret = env.INTERNAL_SERVICE_TOKEN,
): boolean {
  if (!signature) return false;
  const expected = signBody(body, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
