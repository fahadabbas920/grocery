import { PageHeader } from "@grocery/ui";
import { getAccounts } from "@grocery/db/queries";
import { requireOpsProfile } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AccountsTable } from "@/components/accounts-table";
import { InviteRiderButton } from "@/components/invite-rider-button";

export default async function AccountsPage() {
  const profile = await requireOpsProfile();
  if (profile.role !== "admin") redirect("/");

  const supabase = await getServerSupabase();
  const all = await getAccounts(supabase);

  return (
    <div>
      <PageHeader
        title="Accounts"
        description={`${all.length} users registered`}
        action={<InviteRiderButton />}
      />
      <AccountsTable users={all} />
    </div>
  );
}
