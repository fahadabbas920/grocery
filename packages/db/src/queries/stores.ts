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
