import { getCatalog, getCategories, getProductImageUrl } from "@grocery/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { CatalogBrowser, type CatalogItem } from "@/components/catalog-browser";

export default async function HomePage() {
  const supabase = await getServerSupabase();
  const [products, categories] = await Promise.all([getCatalog(supabase), getCategories(supabase)]);

  const items: CatalogItem[] = products.map((p) => {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      categoryId: p.category_id,
      imageUrl: getProductImageUrl(supabase, p.image_path),
      outOfStock: inv?.is_out_of_stock ?? false,
    };
  });

  return <CatalogBrowser items={items} categories={categories} />;
}
