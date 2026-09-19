import type { SupabaseClient } from "@supabase/supabase-js";
import { SETTING_KEYS, type MapProvider } from "@grocery/shared";
import type { Database } from "../types.gen";

type DB = SupabaseClient<Database>;

/** Read a single app setting's JSON value, or null if unset. */
export async function getAppSetting<T = unknown>(supabase: DB, key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.value ?? null) as T | null;
}

/** Upsert an app setting (admin-only at the RLS layer). */
export async function setAppSetting(supabase: DB, key: string, value: unknown) {
  const { error } = await supabase.from("app_settings").upsert({
    key,
    value: value as Database["public"]["Tables"]["app_settings"]["Insert"]["value"],
  });
  if (error) throw error;
}

/** Whether Google Maps features are enabled. Defaults to false when unset. */
export async function isMapsEnabled(supabase: DB): Promise<boolean> {
  return (await getAppSetting<boolean>(supabase, SETTING_KEYS.mapsEnabled)) === true;
}

export interface MapsConfig {
  enabled: boolean;
  /** Which provider the *rendering* token below belongs to. */
  provider: MapProvider;
  /**
   * Public, domain-restricted rendering token (map tiles/markers/embed only).
   * Safe to send to the client. Geocoding never uses this — it goes through
   * the `maps-proxy` Edge Function, which holds its own secret key.
   */
  publicToken: string | null;
}

/** Full runtime maps config: enabled flag + active provider + its public rendering token. */
export async function getMapsConfig(supabase: DB): Promise<MapsConfig> {
  const [enabled, provider, publicToken] = await Promise.all([
    getAppSetting<boolean>(supabase, SETTING_KEYS.mapsEnabled),
    getAppSetting<MapProvider>(supabase, SETTING_KEYS.mapsProvider),
    getAppSetting<string>(supabase, SETTING_KEYS.mapsPublicToken),
  ]);
  return {
    enabled: enabled === true,
    provider: provider ?? "none",
    publicToken: publicToken ?? null,
  };
}
