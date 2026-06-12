import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

/** Completed / cancelled orders for a rider (history, most recent first). */
export async function getRiderOrderHistory(supabase: DB, riderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*, product:products(name))")
    .eq("rider_id", riderId)
    .in("status", ["delivered", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/** Orders currently assigned to a rider that are not yet delivered. */
export async function getRiderActiveOrders(supabase: DB, riderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*, product:products(name))")
    .eq("rider_id", riderId)
    .in("status", ["preparing", "on_the_way"])
    .order("created_at");
  if (error) throw error;
  return data;
}

/** All rider profiles — for ops assignment dropdown. */
export async function getRiders(supabase: DB) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "rider")
    .order("full_name");
  if (error) throw error;
  return data;
}

/** Latest known location of every rider — for the live ops map. */
export async function getRiderLocations(supabase: DB) {
  const { data, error } = await supabase.from("rider_locations").select("*");
  if (error) throw error;
  return data;
}
