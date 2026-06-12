import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types.gen";

/**
 * Browser-side Supabase client for Next.js Client Components.
 * Singleton per browser session to avoid re-creating realtime sockets.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;
  client = createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
  return client;
}
