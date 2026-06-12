import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";
import type { Database } from "./types.gen";

/**
 * Service-role client — bypasses RLS. SERVER ONLY.
 * Use sparingly for privileged operations (e.g. admin creating rider accounts,
 * edge functions). Never expose to the browser or bundle into client code.
 */
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
