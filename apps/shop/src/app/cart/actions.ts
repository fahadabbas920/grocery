"use server";

import { placeOrderSchema, type CartItem } from "@grocery/shared";
import { getServerSupabase } from "@/lib/supabase/server";

export interface PlaceOrderResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

/**
 * Place a cash-on-delivery order. Prices and totals are recomputed from the DB —
 * the client-provided prices are never trusted. RLS ensures the order is created
 * for the authenticated customer only.
 */
export async function placeOrder(input: {
  items: CartItem[];
  address: string;
  delivery_lat: number;
  delivery_lng: number;
  notes?: string | null;
}): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid order details" };
  }

  const supabase = await getServerSupabase();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return { ok: false, error: "Service temporarily unavailable. Please try again." };
  }

  if (!user) return { ok: false, error: "Not authenticated" };

  // Fetch authoritative prices + stock + owning store (with fee/open state) for the products.
  const productIds = parsed.data.items.map((i) => i.product_id);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(
      "id, price, store_id, store:stores(id, name, is_open, delivery_fee), inventory(is_out_of_stock)",
    )
    .in("id", productIds);
  if (productsError || !products) return { ok: false, error: "Could not load products" };

  const productById = new Map(products.map((p) => [p.id, p]));
  for (const p of products) {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    if (inv?.is_out_of_stock) return { ok: false, error: "An item is out of stock" };
  }
  if (parsed.data.items.some((i) => !productById.get(i.product_id)?.store_id)) {
    return { ok: false, error: "Could not load products" };
  }

  // Per-shop metadata (name, open state, delivery fee) keyed by store id.
  const storeMeta = new Map<string, { name: string; is_open: boolean; delivery_fee: number }>();
  for (const p of products) {
    const s = Array.isArray(p.store) ? p.store[0] : p.store;
    if (s)
      storeMeta.set(s.id, {
        name: s.name,
        is_open: s.is_open,
        delivery_fee: Number(s.delivery_fee),
      });
  }

  // Group the cart by owning store → one child order per shop.
  const byStore = new Map<string, { product_id: string; quantity: number; unit_price: number }[]>();
  for (const item of parsed.data.items) {
    const product = productById.get(item.product_id)!;
    const storeId = product.store_id as string;
    const line = {
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: Number(product.price),
    };
    (byStore.get(storeId) ?? byStore.set(storeId, []).get(storeId)!).push(line);
  }

  // Reject the whole order if any shop is closed.
  for (const storeId of byStore.keys()) {
    const meta = storeMeta.get(storeId);
    if (meta && !meta.is_open) {
      return { ok: false, error: `${meta.name} is currently closed. Please remove its items.` };
    }
  }

  // Grand total = every line + each shop's delivery fee.
  let total = 0;
  for (const [storeId, lines] of byStore) {
    total += lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
    total += storeMeta.get(storeId)?.delivery_fee ?? 0;
  }

  // 1. Parent order (customer-facing grand total).
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: user.id,
      total,
      address: parsed.data.address,
      delivery_lat: parsed.data.delivery_lat,
      delivery_lng: parsed.data.delivery_lng,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();
  if (orderError || !order) return { ok: false, error: orderError?.message ?? "Order failed" };

  // 2. One child store_order per shop (with its delivery fee) + line items. Roll back on failure.
  try {
    for (const [storeId, lines] of byStore) {
      const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
      const deliveryFee = storeMeta.get(storeId)?.delivery_fee ?? 0;
      const { data: child, error: childError } = await supabase
        .from("store_orders")
        .insert({ order_id: order.id, store_id: storeId, subtotal, delivery_fee: deliveryFee })
        .select("id")
        .single();
      if (childError || !child) throw childError ?? new Error("Order failed");

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(lines.map((l) => ({ store_order_id: child.id, ...l })));
      if (itemsError) throw itemsError;
    }
  } catch (e) {
    await supabase.from("orders").delete().eq("id", order.id); // cascades to children + items
    return { ok: false, error: e instanceof Error ? e.message : "Order failed" };
  }

  return { ok: true, orderId: order.id };
}
