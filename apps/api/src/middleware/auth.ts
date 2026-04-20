import type { MiddlewareHandler } from 'hono';
import { createHash } from 'node:crypto';
import { errors } from '@remy/shared/errors';
import { env } from '../env.js';
import { prisma } from '../db.js';
import { supabaseAdmin } from '../supabase.js';
import type { AppEnv, AuthUser } from '../context.js';

/**
 * In-memory LRU-ish cache of verified tokens → our User row.
 *
 * Motivation: every authenticated request was doing a ~200ms RPC to
 * Supabase's /auth/v1/user endpoint AND a Prisma upsert. On pages that
 * trigger 3–5 API calls in parallel this stacks up to 1+ second of blocking
 * I/O before the first byte. Caching the verified user for 60s cuts this
 * to one cold verify per user per minute — the rest of the requests are
 * ~1ms in-process lookups.
 *
 * Cache key is SHA-256 of the token so we never hold raw JWTs in memory.
 * Eviction is naive (FIFO on size cap) — fine for MVP. Scale: tens of
 * thousands of daily users before this needs replacing with Redis.
 */
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 2_000;
const tokenCache = new Map<string, { user: AuthUser; expires: number }>();

function cacheKey(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cacheGet(key: string): AuthUser | null {
  const entry = tokenCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    tokenCache.delete(key);
    return null;
  }
  return entry.user;
}

function cacheSet(key: string, user: AuthUser): void {
  if (tokenCache.size >= CACHE_MAX) {
    const first = tokenCache.keys().next().value;
    if (first) tokenCache.delete(first);
  }
  tokenCache.set(key, { user, expires: Date.now() + CACHE_TTL_MS });
}

/**
 * Verifies the Supabase access token from `Authorization: Bearer <jwt>`,
 * resolves (or lazily creates) the matching row in our `User` table.
 *
 * Verification delegates to Supabase's `auth.getUser(token)` so the code
 * works for HS256, ES256, and RS256-signed tokens equally and survives
 * Supabase key-rotation. See cache comment above for the perf story.
 */
export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw errors.unauthenticated('Missing bearer token');
  const token = match[1]!;
  const key = cacheKey(token);

  const hit = cacheGet(key);
  if (hit) {
    c.set('user', hit);
    c.set('accessToken', token);
    await next();
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw errors.unauthenticated('Invalid or expired token');
  const { id: supabaseUserId, email, user_metadata } = data.user;
  if (!email) throw errors.unauthenticated('Token has no email claim');

  // Fast path: user already exists (the common case after first request).
  // We avoid the expensive upsert-with-children when we can.
  let user = await prisma.user.findUnique({
    where: { supabaseUserId },
    select: { id: true, email: true, name: true, role: true, supabaseUserId: true },
  });

  if (!user) {
    // Cold path: first time we see this user — create the mirror row and
    // companion rows (balance/subscription/bonus). Exposed here as a safety
    // net for projects where the Supabase DB trigger didn't run.
    user = await prisma.user.create({
      data: {
        supabaseUserId,
        email,
        name: typeof user_metadata?.name === 'string' ? user_metadata.name : null,
        balance: { create: { currentBalance: 30, lifetimeGranted: 30 } },
        subscription: { create: { plan: 'free', status: 'active' } },
        transactions: {
          create: { kind: 'bonus', status: 'applied', amount: 30, reason: 'Signup bonus' },
        },
      },
      select: { id: true, email: true, name: true, role: true, supabaseUserId: true },
    });
  } else if (user.email !== email) {
    // Email changed in Supabase Auth — keep our mirror in sync.
    user = await prisma.user.update({
      where: { id: user.id },
      data: { email },
      select: { id: true, email: true, name: true, role: true, supabaseUserId: true },
    });
  }

  cacheSet(key, user);
  c.set('user', user);
  c.set('accessToken', token);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user) throw errors.unauthenticated();
  const isAdminByRole = user.role === 'admin';
  const isAdminByEmail = env.ADMIN_EMAILS.includes(user.email.toLowerCase());
  if (!isAdminByRole && !isAdminByEmail) throw errors.forbidden('Admin only');
  await next();
};

export const requireInternalToken: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = c.req.header('x-remy-token');
  if (!token || token !== env.INTERNAL_SERVICE_TOKEN) {
    throw errors.unauthenticated('Internal token required');
  }
  await next();
};
