import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

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
