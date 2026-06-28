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

  // Fetch authoritative prices + stock for the ordered products.
  const productIds = parsed.data.items.map((i) => i.product_id);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price, inventory(is_out_of_stock)")
    .in("id", productIds);
  if (productsError || !products) return { ok: false, error: "Could not load products" };

  const priceById = new Map(products.map((p) => [p.id, Number(p.price)]));
  for (const p of products) {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    if (inv?.is_out_of_stock) return { ok: false, error: "An item is out of stock" };
  }

  const total = parsed.data.items.reduce((sum, item) => {
    const price = priceById.get(item.product_id) ?? 0;
    return sum + price * item.quantity;
  }, 0);

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

  const itemsToInsert = parsed.data.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: priceById.get(item.product_id) ?? 0,
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
  if (itemsError) {
    // Roll back the orphaned order so the DB stays consistent.
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, error: itemsError.message };
  }

  return { ok: true, orderId: order.id };
}
