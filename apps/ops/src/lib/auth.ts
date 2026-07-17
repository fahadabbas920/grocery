import "server-only";
import { redirect } from "next/navigation";
import { OPS_ROLES, type UserRole } from "@grocery/shared";
import { getServerSupabase } from "./supabase/server";

export interface SessionProfile {
  id: string;
  role: UserRole;
  full_name: string;
  /** The store this user operates (stock_keeper); null for admin (global). */
  store_id: string | null;
}

/**
 * Resolve the signed-in user's profile, or redirect to /login.
 * Also enforces that only Ops roles (admin, stock_keeper) reach the console.
 */
export async function requireOpsProfile(): Promise<SessionProfile> {
  const supabase = await getServerSupabase();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    redirect("/login");
  }

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || !OPS_ROLES.includes(profile.role)) {
    redirect("/login?error=forbidden");
  }

  // Resolve the vendor's store (admins are global → null).
  let store_id: string | null = null;
  if (profile.role === "stock_keeper") {
    const { data: membership } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", user.id)
      .maybeSingle();
    store_id = membership?.store_id ?? null;
  }

  return { ...profile, store_id };
}

export function isAdmin(role: UserRole) {
  return role === "admin";
}
