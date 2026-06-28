import "server-only";
import { redirect } from "next/navigation";
import { OPS_ROLES, type UserRole } from "@grocery/shared";
import { getServerSupabase } from "./supabase/server";

export interface SessionProfile {
  id: string;
  role: UserRole;
  full_name: string;
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

  return profile;
}

export function isAdmin(role: UserRole) {
  return role === "admin";
}
