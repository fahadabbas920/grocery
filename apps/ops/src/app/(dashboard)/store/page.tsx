import { redirect } from "next/navigation";
import { PageHeader } from "@grocery/ui";
import { getStore } from "@grocery/db/queries";
import { requireOpsProfile } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { StoreSettingsForm } from "@/components/store-settings-form";

export default async function StorePage() {
  const profile = await requireOpsProfile();
  // Vendor-only page; admins manage stores under /vendors.
  if (profile.role !== "stock_keeper" || !profile.store_id) redirect("/");

  const supabase = await getServerSupabase();
  const store = await getStore(supabase, profile.store_id);

  return (
    <div className="max-w-xl">
      <PageHeader title="Store settings" description="Your shop profile and delivery area" />
      <StoreSettingsForm
        storeId={store.id}
        status={store.status}
        initial={{
          name: store.name,
          phone: store.phone,
          address: store.address,
          delivery_lat: store.delivery_lat,
          delivery_lng: store.delivery_lng,
          delivery_radius_m: store.delivery_radius_m,
          is_open: store.is_open,
          delivery_fee: Number(store.delivery_fee),
        }}
      />
    </div>
  );
}
