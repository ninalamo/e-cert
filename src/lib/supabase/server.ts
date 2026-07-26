import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service role key.
 *
 * RLS relies on `current_user_id()` which reads `current_setting('app.user_id')`,
 * but this session variable is never set — the proxy middleware only injects HTTP
 * headers (`x-user-id` etc.), not PostgreSQL GUCs.  Because each Supabase JS
 * client `.from()` call is a separate HTTP request to PostgREST (and therefore a
 * separate PostgreSQL transaction), `SET LOCAL` cannot persist across requests.
 *
 * Using the service role key bypasses RLS.  Authorization is already enforced at
 * the application layer via `requireRole()` / `requireSession()` in server actions
 * and via the proxy middleware for protected routes.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient(url, key);
}
