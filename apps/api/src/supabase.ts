import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

/** Service-role client — bypasses RLS, used by the API for admin operations. */
export const supabaseAdmin: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Build a per-request client scoped to the user's Supabase JWT. Respects RLS
 * in case we ever re-enable it on a schema.
 */
export function supabaseForRequest(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
