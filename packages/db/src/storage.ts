import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS } from "@grocery/shared";
import type { Database } from "./types.gen";

type DB = SupabaseClient<Database>;

/**
 * Public URL for a product image with an on-the-fly resize/quality transform
 * (served by Supabase Storage's image renderer). Returns null when no image set.
 */
export function getProductImageUrl(supabase: DB, imagePath: string | null): string | null {
  if (!imagePath) return null;
  // Transform (resize/quality) requires Supabase Pro. Use the plain public URL
  // so images work on the free plan; CSS handles the display sizing.
  const { data } = supabase.storage.from(STORAGE_BUCKETS.productImages).getPublicUrl(imagePath);
  return data.publicUrl;
}

/** Upload a product image and return its storage path (stored on the product row). */
export async function uploadProductImage(supabase: DB, file: File, fileName: string) {
  const path = `${crypto.randomUUID()}-${fileName}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.productImages)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}
