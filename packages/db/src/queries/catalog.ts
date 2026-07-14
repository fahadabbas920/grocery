import type { SupabaseClient } from "@supabase/supabase-js";
import { inventoryUpdateSchema, productInputSchema, type ProductInput } from "@grocery/shared";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

interface StockInput {
  quantity: number;
  is_out_of_stock: boolean;
}

/** Full catalog with category + live stock state — used by shop and ops. */
export async function getCatalog(supabase: DB) {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), inventory(quantity, is_out_of_stock)")
    .order("name");
  if (error) throw error;
  return data;
}

export async function getCategories(supabase: DB) {
  const { data, error } = await supabase.from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data;
}

export async function getProduct(supabase: DB, productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*), inventory(quantity, is_out_of_stock)")
    .eq("id", productId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// Centralized product/inventory writes with zod validation. Throw on error.

/** Create a product row plus its initial inventory. Returns the new product id. */
export async function createProduct(supabase: DB, product: ProductInput, stock: StockInput) {
  const values = productInputSchema.parse(product);
  const { data: row, error } = await supabase.from("products").insert(values).select("id").single();
  if (error) throw error;

  const inv = inventoryUpdateSchema.parse({ product_id: row.id, ...stock });
  const { error: invError } = await supabase.from("inventory").insert(inv);
  if (invError) throw invError;
  return row.id;
}

/** Update an existing product row plus its inventory. */
export async function updateProduct(
  supabase: DB,
  productId: string,
  product: ProductInput,
  stock: StockInput,
) {
  const values = productInputSchema.parse(product);
  const { error } = await supabase.from("products").update(values).eq("id", productId);
  if (error) throw error;

  const inv = inventoryUpdateSchema.parse({ product_id: productId, ...stock });
  const { error: invError } = await supabase
    .from("inventory")
    .update({ quantity: inv.quantity, is_out_of_stock: inv.is_out_of_stock })
    .eq("product_id", productId);
  if (invError) throw invError;
}

/** Permanently delete a product (inventory cascades at the DB layer). */
export async function deleteProduct(supabase: DB, productId: string) {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
}
