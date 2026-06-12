import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types.gen";

/**
 * React Native / Expo Supabase client.
 * Uses AsyncStorage for session persistence and disables URL session detection
 * (there is no browser URL to parse on native).
 */
let client: ReturnType<typeof createClient<Database>> | undefined;

export function createNativeClient() {
  if (client) return client;
  client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
