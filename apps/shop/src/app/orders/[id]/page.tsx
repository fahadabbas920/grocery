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
  } catch (e) {
    // PostgREST returns PGRST116 when `.single()` matches no row → genuine 404.
    // Any other error (network, RLS, 5xx) is transient — let the error boundary show.
    if ((e as { code?: string })?.code === "PGRST116") notFound();
    throw e;
  }

  const mapsEnabled = await isMapsEnabled(supabase);

  const children = (order.store_orders ?? []).map((so) => ({
    id: so.id,
    storeName: so.store?.name ?? "Shop",
    status: so.status,
    riderId: so.rider_id,
  }));

  return (
    <OrderTracker
      orderId={order.id}
      initialChildren={children}
      total={Number(order.total)}
      address={order.address}
      mapsEnabled={mapsEnabled}
    />
  );
}
