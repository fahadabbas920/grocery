import { PageHeader } from "@grocery/ui";
import { getStoreOrders, getRiders } from "@grocery/db/queries";
import { requireOpsProfile, isAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/orders-board";

export default async function OrdersPage() {
  const profile = await requireOpsProfile();
  const supabase = await getServerSupabase();
  // Vendor is scoped to their store; admin (store_id null) sees every store's orders.
  const [orders, riders] = await Promise.all([
    getStoreOrders(supabase, { storeId: profile.store_id ?? undefined }),
    getRiders(supabase),
  ]);

  return (
    <div>
      <PageHeader title="Orders" description="Live board — updates in real time" />
      <OrdersBoard
        admin={isAdmin(profile.role)}
        initialOrders={orders.map((o) => ({
          id: o.id,
          status: o.status,
          subtotal: Number(o.subtotal),
          address: o.order?.address ?? "",
          storeName: o.store?.name ?? null,
          rider_id: o.rider_id,
          created_at: o.created_at,
        }))}
        riders={riders}
      />
    </div>
  );
}
