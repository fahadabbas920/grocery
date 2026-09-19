"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Input } from "@grocery/ui";
import { SETTING_KEYS, MAP_PROVIDERS, type MapProvider } from "@grocery/shared";
import { setAppSetting } from "@grocery/db/queries";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDER_LABELS: Record<MapProvider, string> = {
  none: "None",
  mapbox: "Mapbox",
  google: "Google Maps",
};

interface MapsToggleProps {
  initialEnabled: boolean;
  initialProvider: MapProvider;
  initialPublicToken: string | null;
}

export function MapsToggle({
  initialEnabled,
  initialProvider,
  initialPublicToken,
}: MapsToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [provider, setProvider] = useState<MapProvider>(initialProvider);
  const [publicToken, setPublicToken] = useState(initialPublicToken ?? "");
  const [savingEnabled, setSavingEnabled] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  async function toggle(next: boolean) {
    setSavingEnabled(true);
    try {
      await setAppSetting(getBrowserSupabase(), SETTING_KEYS.mapsEnabled, next);
      setEnabled(next);
      toast.success(`Maps ${next ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSavingEnabled(false);
    }
  }

  async function saveConfig() {
    setSavingConfig(true);
    try {
      const supabase = getBrowserSupabase();
      await Promise.all([
        setAppSetting(supabase, SETTING_KEYS.mapsProvider, provider),
        setAppSetting(supabase, SETTING_KEYS.mapsPublicToken, publicToken.trim() || null),
      ]);
      toast.success("Maps provider config saved");
    } catch {
      toast.error("Failed to save maps config");
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="maps-switch" className="text-sm font-medium">
            Maps integration
          </Label>
          <p className="text-xs text-(--color-muted-foreground) mt-0.5">
            {enabled
              ? "Live map visible on customer order-tracking page."
              : "Map is hidden; text status is shown instead."}
          </p>
        </div>
        <Switch
          id="maps-switch"
          checked={enabled}
          onCheckedChange={toggle}
          disabled={savingEnabled}
        />
      </div>

      <div className="space-y-3 border-t border-(--color-border) pt-4">
        <div className="grid gap-1.5">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as MapProvider)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAP_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Public rendering token</Label>
          <Input
            value={publicToken}
            onChange={(e) => setPublicToken(e.target.value)}
            placeholder={provider === "mapbox" ? "pk.xxxxx" : "AIza…"}
          />
          <p className="text-xs text-(--color-muted-foreground)">
            The public, domain-restricted token used only to render map tiles/markers in the browser
            — safe to store here. Restrict it to your app&apos;s domain(s) in the{" "}
            {provider === "google" ? "Google Cloud" : "Mapbox"} console. Search/geocoding uses a
            separate secret key configured server-side via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">supabase secrets set</code>,
            never stored here.
          </p>
        </div>

        <Button size="sm" onClick={saveConfig} disabled={savingConfig}>
          {savingConfig ? "Saving…" : "Save provider config"}
        </Button>
      </div>
    </div>
  );
}
