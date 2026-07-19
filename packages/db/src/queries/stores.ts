import type { SupabaseClient } from "@supabase/supabase-js";
import {
  storeInputSchema,
  type StoreInput,
  type StoreRole,
  type StoreStatus,
} from "@grocery/shared";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

/** The caller's store membership (store_id + role), or null for admin/customer/rider. */
export async function getStoreMembership(supabase: DB, userId: string) {
  const { data, error } = await supabase
    .from("store_members")
    .select("store_id, store_role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** A single store by id. */
export async function getStore(supabase: DB, storeId: string) {
  const { data, error } = await supabase.from("stores").select("*").eq("id", storeId).single();
  if (error) throw error;
  return data;
}

/** All stores (admin vendor list), newest first. */
export async function listStores(supabase: DB) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Create a store (admin, during vendor onboarding). Returns the new store id. */
export async function createStore(supabase: DB, input: StoreInput) {
  const values = storeInputSchema.parse(input);
  const { data, error } = await supabase.from("stores").insert(values).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Update a store's profile (admin, or the vendor for their own — status excluded). */
export async function updateStore(supabase: DB, storeId: string, input: StoreInput) {
  const values = storeInputSchema.parse(input);
  const { error } = await supabase.from("stores").update(values).eq("id", storeId);
  if (error) throw error;
}

/** Change a store's lifecycle status (admin only — approve/suspend). */
export async function setStoreStatus(supabase: DB, storeId: string, status: StoreStatus) {
  const { error } = await supabase.from("stores").update({ status }).eq("id", storeId);
  if (error) throw error;
}

/** Link a user to a store with a role (admin, during onboarding). */
export async function addStoreMember(
  supabase: DB,
  storeId: string,
  userId: string,
  role: StoreRole = "owner",
) {
  const { error } = await supabase
    .from("store_members")
    .insert({ store_id: storeId, user_id: userId, store_role: role });
  if (error) throw error;
}

/**
 * Vendor owners with a login but no shop yet — stuck mid-onboarding (step 1 of
 * createVendorUserAction done, step 2 createShopForOwnerAction never run). Surfaced
 * on the Vendors page as a "pending" row so an admin can resume step 2.
 */
export async function getPendingVendorOwners(supabase: DB) {
  const [{ data: owners, error: ownersErr }, { data: members, error: membersErr }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name, phone").eq("role", "stock_keeper"),
      supabase.from("store_members").select("user_id"),
    ]);
  if (ownersErr) throw ownersErr;
  if (membersErr) throw membersErr;

  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  return (owners ?? []).filter((o) => !memberIds.has(o.id));
}

/** The owner linked to a store (1 vendor : 1 shop for now), or null if none is linked. */
export async function getStoreOwner(supabase: DB, storeId: string) {
  const { data: member, error: memberErr } = await supabase
    .from("store_members")
    .select("user_id")
    .eq("store_id", storeId)
    .eq("store_role", "owner")
    .maybeSingle();
  if (memberErr) throw memberErr;
  if (!member) return null;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", member.user_id)
    .maybeSingle();
  if (profileErr) throw profileErr;

  return { id: member.user_id, full_name: profile?.full_name ?? "", phone: profile?.phone ?? null };
}
