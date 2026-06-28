import { notFound, redirect } from "next/navigation";
import { getOrderWithItems, isMapsEnabled } from "@grocery/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";
import { OrderTracker } from "@/components/order-tracker";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    redirect(`/login?redirect=/orders/${id}`);
  }

  if (!user) redirect(`/login?redirect=/orders/${id}`);

  let order;
  try {
    order = await getOrderWithItems(supabase, id);
  } catch {
    notFound();
  }

  const mapsEnabled = await isMapsEnabled(supabase);

  return (
    <OrderTracker
      orderId={order.id}
      initialStatus={order.status}
      riderId={order.rider_id}
      total={Number(order.total)}
      address={order.address}
      mapsEnabled={mapsEnabled}
    />
  );
}
