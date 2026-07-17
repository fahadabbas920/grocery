import type { SupabaseClient } from "@supabase/supabase-js";
import { assignRiderSchema, updateOrderStatusSchema, type OrderStatus } from "@grocery/shared";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

// A customer's PARENT order with its per-shop children (each with store name + items).
const PARENT_WITH_CHILDREN =
  "*, store_orders(*, store:stores(name), items:order_items(*, product:products(name, image_path)))" as const;

// A per-shop CHILD order with its items, store, and the parent's delivery context.
// This is the tenant-scoped order surface used by the ops board and rider app.
const CHILD_WITH_CONTEXT =
  "*, store:stores(name), order:orders(id, address, delivery_lat, delivery_lng, customer_id, notes, created_at), items:order_items(*, product:products(name, image_path))" as const;

// ─── Customer (shop) ────────────────────────────────────────────────────────

/** A customer's order history — parent orders, each with per-shop children. */
export async function getMyOrders(supabase: DB, customerId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(PARENT_WITH_CHILDREN)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** A single parent order + its children (customer order tracking). */
export async function getOrderWithItems(supabase: DB, orderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(PARENT_WITH_CHILDREN)
    .eq("id", orderId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Vendor / ops board (per-shop child orders) ──────────────────────────────

/**
 * The live order board. Returns per-shop child orders (newest first). RLS scopes a
 * vendor to their own store automatically; pass `storeId` to filter (e.g. admin viewing
 * one store). `statuses` filters the fulfillment status.
 */
export async function getStoreOrders(
  supabase: DB,
  opts: { storeId?: string; statuses?: OrderStatus[] } = {},
) {
  let query = supabase
    .from("store_orders")
    .select(CHILD_WITH_CONTEXT)
    .order("created_at", { ascending: false });
  if (opts.storeId) query = query.eq("store_id", opts.storeId);
  if (opts.statuses?.length) query = query.in("status", opts.statuses);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Stock-keeper prep queue: child orders awaiting preparation. */
export async function getPrepQueue(supabase: DB, storeId?: string) {
  return getStoreOrders(supabase, { storeId, statuses: ["placed", "preparing"] });
}

/** A single child order with context (rider / vendor detail view). */
export async function getStoreOrder(supabase: DB, storeOrderId: string) {
  const { data, error } = await supabase
    .from("store_orders")
    .select(CHILD_WITH_CONTEXT)
    .eq("id", storeOrderId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Mutations (target the child order) ──────────────────────────────────────
// The Postgres transition guard enforces legal status changes; guard_store_order_rider
// enforces that only admins assign riders. These validate shape and throw on error.

/** Advance a child order's fulfillment status. */
export async function updateOrderStatus(supabase: DB, storeOrderId: string, status: OrderStatus) {
  const input = updateOrderStatusSchema.parse({ order_id: storeOrderId, status });
  const { error } = await supabase
    .from("store_orders")
    .update({ status: input.status })
    .eq("id", input.order_id);
  if (error) throw error;
}

/** Assign a rider to a child order (central dispatch — admin only, enforced by RLS + guard). */
export async function assignRider(supabase: DB, storeOrderId: string, riderId: string) {
  const input = assignRiderSchema.parse({ order_id: storeOrderId, rider_id: riderId });
  const { error } = await supabase
    .from("store_orders")
    .update({ rider_id: input.rider_id })
    .eq("id", input.order_id);
  if (error) throw error;
}
