import { redirect } from "next/navigation";
import { PageHeader } from "@grocery/ui";
import { getStoreOrders, getRiders, getRiderLocations, listStores } from "@grocery/db/queries";
import { requireOpsProfile, isAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { DispatchBoard } from "@/components/dispatch-board";

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const profile = await requireOpsProfile();
  if (!isAdmin(profile.role)) redirect("/");

  const { store: storeFilter } = await searchParams;
  const supabase = await getServerSupabase();
  const [orders, riders, locations, stores] = await Promise.all([
    getStoreOrders(supabase, {
      storeId: storeFilter || undefined,
      statuses: ["placed", "preparing", "on_the_way"],
    }),
    getRiders(supabase),
    getRiderLocations(supabase),
    listStores(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Rider dispatch"
        description="Assign riders to active orders across all shops"
      />
      <DispatchBoard
        actorId={profile.id}
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
        activeStoreId={storeFilter ?? null}
        initialOrders={orders.map((o) => ({
          id: o.id,
          status: o.status,
          storeName: o.store?.name ?? "Shop",
          address: o.order?.address ?? "",
          rider_id: o.rider_id,
          created_at: o.created_at,
        }))}
        riders={riders}
        locations={locations.map((l) => ({ rider_id: l.rider_id, updated_at: l.updated_at }))}
      />
    </div>
  );
}
