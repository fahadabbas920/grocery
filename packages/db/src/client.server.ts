import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types.gen";

/**
 * Minimal cookie adapter shape — matches Next.js `cookies()` store.
 * We accept it as a param so this package stays framework-agnostic and does
 * not import `next/headers` (which would break non-Next consumers).
 */
export interface CookieMethods {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
}

/**
 * Server-side Supabase client for Next.js Server Components, Route Handlers,
 * and Server Actions. Pass the cookie adapter built from `next/headers`.
 */
export function createServerSupabase(cookies: CookieMethods) {
  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          cookies.setAll(toSet);
        } catch {
          // setAll called from a Server Component — safe to ignore when middleware refreshes sessions.
        }
      },
    },
  });
}
