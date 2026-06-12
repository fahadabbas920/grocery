import { PageHeader, ProductCard } from "@grocery/ui";
import { getCatalog, getCategories, getProductImageUrl } from "@grocery/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { AddProductForm } from "@/components/add-product-form";

export default async function CatalogPage() {
  const supabase = await getServerSupabase();
  const [products, categories] = await Promise.all([
    getCatalog(supabase),
    getCategories(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Catalog"
        description={`${products.length} product${products.length !== 1 ? "s" : ""}`}
        action={<AddProductForm categories={categories} />}
      />

      {products.length === 0 ? (
        <p className="text-sm text-(--color-muted-foreground)">
          No products yet. Add one using the button above.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((p) => {
            const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
            return (
              <ProductCard
                key={p.id}
                name={p.name}
                price={Number(p.price)}
                imageUrl={getProductImageUrl(supabase, p.image_path)}
                outOfStock={inv?.is_out_of_stock ?? false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
