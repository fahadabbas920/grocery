import { redirect } from "next/navigation";
import { PageHeader } from "@grocery/ui";
import { getMapsConfig } from "@grocery/db/queries";
import { requireOpsProfile } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";
import { MapsToggle } from "@/components/maps-toggle";
import { Separator } from "@grocery/ui/components/separator";

export default async function SettingsPage() {
  const profile = await requireOpsProfile();
  if (profile.role !== "admin") redirect("/");

  const supabase = await getServerSupabase();
  const mapsConfig = await getMapsConfig(supabase);

  return (
    <div>
      <PageHeader title="Settings" description="Runtime configuration for the platform" />

      <div className="max-w-xl space-y-0 rounded-xl border border-(--color-border) bg-(--color-card) overflow-hidden">
        <div className="p-5">
          <h3 className="text-sm font-semibold text-(--color-foreground)">Integrations</h3>
          <p className="mt-0.5 text-xs text-(--color-muted-foreground)">
            Third-party services used by the platform
          </p>
        </div>
        <Separator />
        <div className="p-5">
          <MapsToggle
            initialEnabled={mapsConfig.enabled}
            initialProvider={mapsConfig.provider}
            initialPublicToken={mapsConfig.publicToken}
          />
        </div>
      </div>
    </div>
  );
}
