import { redirect } from "next/navigation";
import { PageHeader } from "@grocery/ui";
import { listStores } from "@grocery/db/queries";
import { requireOpsProfile, isAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { VendorsManager } from "@/components/vendors-manager";

export default async function VendorsPage() {
  const profile = await requireOpsProfile();
  if (!isAdmin(profile.role)) redirect("/");

  const supabase = await getServerSupabase();
  const stores = await listStores(supabase);

  return (
    <div>
      <PageHeader title="Vendors" description="Onboard shops and manage their accounts" />
      <VendorsManager
        initialStores={stores.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug,
          phone: s.phone,
          address: s.address,
          status: s.status as "invited" | "onboarding" | "active" | "suspended",
        }))}
      />
    </div>
  );
}
