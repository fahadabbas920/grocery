import { PageHeader } from "@grocery/ui";
import { getCatalog } from "@grocery/db";
import { getServerSupabase } from "@/lib/supabase/server";
import { InventoryTable } from "@/components/inventory-table";

export default async function InventoryPage() {
  const supabase = await getServerSupabase();
  const products = await getCatalog(supabase);

  const rows = products.map((p) => {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    return {
      product_id: p.id,
      name: p.name,
      quantity: inv?.quantity ?? 0,
      is_out_of_stock: inv?.is_out_of_stock ?? false,
    };
  });

  return (
    <div>
      <PageHeader title="Inventory" description="Manage stock levels and availability" />
      <InventoryTable rows={rows} />
    </div>
  );
}
