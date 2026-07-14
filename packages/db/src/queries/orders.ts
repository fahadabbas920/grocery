import type { SupabaseClient } from "@supabase/supabase-js";
import { assignRiderSchema, updateOrderStatusSchema, type OrderStatus } from "@grocery/shared";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

const ORDER_WITH_ITEMS = "*, items:order_items(*, product:products(name, image_path))" as const;

/** A customer's order history (RLS restricts to own orders). */
export async function getMyOrders(supabase: DB, customerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getOrderWithItems(supabase: DB, orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS)
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

/** Live orders board for ops — optionally filtered by status. Newest first, to
 * match how the realtime board prepends freshly-inserted orders. */
export async function getOrdersByStatus(supabase: DB, statuses?: OrderStatus[]) {
  let query = supabase
    .from("orders")
    .select(ORDER_WITH_ITEMS)
    .order("created_at", { ascending: false });
  if (statuses?.length) query = query.in("status", statuses);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Stock-keeper prep queue: orders awaiting preparation. */
export async function getPrepQueue(supabase: DB) {
  return getOrdersByStatus(supabase, ["placed", "preparing"]);
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// Centralized writes so validation lives in one place and callers don't hand-roll
// `supabase.from(...)` chains. The Postgres transition-guard trigger remains the
// real enforcement; these validate shape and throw on error (consistent with reads).

/** Advance an order to a new status. */
export async function updateOrderStatus(supabase: DB, orderId: string, status: OrderStatus) {
  const input = updateOrderStatusSchema.parse({ order_id: orderId, status });
  const { error } = await supabase
    .from("orders")
    .update({ status: input.status })
    .eq("id", input.order_id);
  if (error) throw error;
}

/** Assign a rider to an order. */
export async function assignRider(supabase: DB, orderId: string, riderId: string) {
  const input = assignRiderSchema.parse({ order_id: orderId, rider_id: riderId });
  const { error } = await supabase
    .from("orders")
    .update({ rider_id: input.rider_id })
    .eq("id", input.order_id);
  if (error) throw error;
}
