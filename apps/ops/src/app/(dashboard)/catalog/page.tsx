import { PageHeader } from "@grocery/ui";
import { getCatalog, getCategories, getProductImageUrl } from "@grocery/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { AddProductForm } from "@/components/add-product-form";
import { CatalogGrid } from "@/components/catalog-grid";

export default async function CatalogPage() {
  const supabase = await getServerSupabase();
  const [products, categories] = await Promise.all([
    getCatalog(supabase),
    getCategories(supabase),
  ]);

  const mapped = products.map((p) => {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    const cat = Array.isArray(p.category) ? p.category[0] : p.category;
    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      imageUrl: getProductImageUrl(supabase, p.image_path),
      imagePath: p.image_path,
      description: p.description ?? null,
      categoryId: p.category_id,
      categoryName: cat?.name ?? "Uncategorised",
      outOfStock: inv?.is_out_of_stock ?? false,
      quantity: inv?.quantity ?? 0,
    };
  });

  return (
    <div>
      <PageHeader
        title="Catalog"
        description={`${products.length} product${products.length !== 1 ? "s" : ""}`}
        action={<AddProductForm categories={categories} />}
      />
      <CatalogGrid products={mapped} categories={categories} />
    </div>
  );
}
