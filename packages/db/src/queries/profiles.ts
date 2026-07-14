import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

/** All user accounts (admin-only at the RLS layer), grouped-friendly by role. */
export async function getAccounts(supabase: DB) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .order("role");
  if (error) throw error;
  return data;
}

/** A single profile by user id, or null if none. */
export async function getProfile(supabase: DB, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
