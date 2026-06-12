/**
 * Centralized, validated env access for Supabase clients.
 *
 * NO secrets are hardcoded here — values come from the environment at runtime.
 *
 * IMPORTANT: each var is referenced STATICALLY (e.g. `process.env.NEXT_PUBLIC_SUPABASE_URL`),
 * never via a computed key like `process.env[name]`. Next.js and Expo only inline
 * env vars into the client bundle when they see the literal `process.env.<NAME>`
 * expression at build time — dynamic access resolves to `undefined` in the browser.
 *
 * `NEXT_PUBLIC_*` is inlined by Next (web), `EXPO_PUBLIC_*` by Expo (native), and
 * the bare `SUPABASE_*` forms are available server-side (Node/edge).
 */

function require_(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing required Supabase env var: ${name}. Copy .env.example to .env(.local) and fill it in.`,
    );
  }
  return value;
}

/** Public Supabase URL — safe to expose to the client. */
export function getSupabaseUrl(): string {
  return require_(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL,
    "SUPABASE_URL",
  );
}

/** Public anon key — safe to expose; RLS enforces access. */
export function getSupabaseAnonKey(): string {
  return require_(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY,
    "SUPABASE_ANON_KEY",
  );
}

/** Service-role key — SERVER ONLY. Never import this in client/browser code. */
export function getSupabaseServiceRoleKey(): string {
  return require_(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
}
