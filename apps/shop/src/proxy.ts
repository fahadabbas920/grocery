import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session cookie on each request. The shop is
 * public (browsing needs no login); per-page guards handle protected routes.
 *
 * Uses the Next.js 16 `proxy` convention (formerly `middleware`).
 *
 * Pattern from Supabase SSR docs: response is recreated inside setAll so the
 * updated request cookies are forwarded to Server Components.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session token if it has expired. Never throws — a network
  // error here should not break the request; the page-level auth guard handles
  // the case where the user is actually not logged in.
  try {
    await supabase.auth.getUser();
  } catch {
    // Supabase unreachable — pass through, page guards will redirect if needed.
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
