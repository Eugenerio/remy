import 'server-only';
import { env } from './env';
import { createClient } from './supabase/server';

export interface ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  requestId?: string;
}

async function currentAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Server-side API fetch. Use in Server Components, Route Handlers, or
 * Server Actions — anywhere `next/headers` is available. The browser
 * equivalent is `@/lib/api` (without `-server`).
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await currentAccessToken();
  const url = path.startsWith('http') ? path : `${env.API_URL}${path}`;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(url, {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const err = new Error(body?.error?.message ?? `HTTP ${response.status}`) as ApiError;
    err.status = response.status;
    err.code = body?.error?.code ?? 'unknown';
    err.details = body?.error?.details;
    err.requestId = body?.error?.request_id;
    throw err;
  }
  return body as T;
}
