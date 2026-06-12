import { UserPlus } from "lucide-react";
import { PageHeader } from "@grocery/ui";
import { requireOpsProfile } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@grocery/ui";
import { AccountsTable } from "@/components/accounts-table";

export default async function AccountsPage() {
  const profile = await requireOpsProfile();
  if (profile.role !== "admin") redirect("/");

  const supabase = await getServerSupabase();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .order("role");

  const all = users ?? [];

  return (
    <div>
      <PageHeader
        title="Accounts"
        description={`${all.length} users registered`}
        action={
          <Button disabled title="Coming soon — requires service-role Server Action">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite rider
          </Button>
        }
      />
      <AccountsTable users={all} />
    </div>
  );
}
