import { PageHeader } from "@grocery/ui";
import { getOrdersByStatus, getRiders } from "@grocery/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";
import { OrdersBoard } from "@/components/orders-board";

export default async function OrdersPage() {
  const supabase = await getServerSupabase();
  const [orders, riders] = await Promise.all([
    getOrdersByStatus(supabase),
    getRiders(supabase),
  ]);

  return (
    <div>
      <PageHeader title="Orders" description="Live board — updates in real time" />
      <OrdersBoard
        initialOrders={orders.map((o) => ({
          id: o.id,
          status: o.status,
          total: Number(o.total),
          address: o.address,
          rider_id: o.rider_id,
          created_at: o.created_at,
        }))}
        riders={riders}
      />
    </div>
  );
}
