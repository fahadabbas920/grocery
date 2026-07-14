# Ops Console (`@grocery/ops`)

Next.js 16 App Router. Merged **Admin + Stocks** tool, role-gated for `admin` and
`stock_keeper`. Runs on port **3001**.

## Auth & gating

- `src/proxy.ts` — Next.js 16 proxy (formerly middleware): refreshes the Supabase session, redirects anonymous users to `/login`.
- `src/lib/auth.ts` `requireOpsProfile()` — server-side gate used by the dashboard
  layout; redirects non-ops users out. RLS is the real enforcement.

## Routes

- `/login` — staff sign-in (`components/login-form.tsx`).
- `(dashboard)/` — sidebar layout; nav items filtered by role.
  - `/` — KPIs (active orders, delivered, revenue).
  - `/orders` — live board (`components/orders-board.tsx`): Realtime updates,
    manual rider assignment, status advancement (guarded by allowed transitions).
  - `/catalog` — product grid + add/edit product sheet (image upload to Storage).
    Stock quantity + out-of-stock are edited inline in the product sheet
    (`components/product-form-sheet.tsx`) — there is no separate `/inventory` route.
  - `/accounts` — **admin only**; lists users/riders.
  - `/settings` — **admin only**; runtime feature toggles. Includes the Google Maps
    switch (`components/maps-toggle.tsx`) writing to `app_settings.maps_enabled`.

## Supabase access

- `src/lib/supabase/server.ts` — cookie-bound server client.
- `src/lib/supabase/client.ts` — browser client (realtime, mutations).

## Env (`.env.example` → `.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` (server-only, for rider account creation),
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Run

`pnpm -F @grocery/ops dev`

## TODO (post-scaffold)

- Live rider map page (Google Maps + `rider_locations` Realtime).
- Rider account creation Server Action using `@grocery/db/admin`.
- Sales report charts.
