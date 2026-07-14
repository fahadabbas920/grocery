"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SETTING_KEYS } from "@grocery/shared";
import { setAppSetting } from "@grocery/db/queries";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function MapsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setSaving(true);
    try {
      await setAppSetting(getBrowserSupabase(), SETTING_KEYS.mapsEnabled, next);
      setEnabled(next);
      toast.success(`Google Maps ${next ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor="maps-switch" className="text-sm font-medium">
          Google Maps integration
        </Label>
        <p className="text-xs text-(--color-muted-foreground) mt-0.5">
          {enabled
            ? "Live map visible on customer order-tracking page."
            : "Map is hidden; text status is shown instead."}
        </p>
      </div>
      <Switch id="maps-switch" checked={enabled} onCheckedChange={toggle} disabled={saving} />
    </div>
  );
}
