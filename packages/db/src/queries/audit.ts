import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "../types.gen";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

/**
 * Record a privileged admin action. RLS requires the caller to be an admin and
 * `actorId` to equal their own uid. Best-effort — callers should not fail the
 * primary action if logging fails.
 */
export async function logAdminAction(supabase: DB, actorId: string, action: string, detail?: Json) {
  const { error } = await supabase
    .from("admin_audit_log")
    .insert({ actor_id: actorId, action, detail: detail ?? null });
  if (error) throw error;
}

/** Recent admin audit entries (admin-only). */
export async function getAuditLog(supabase: DB, limit = 100) {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
