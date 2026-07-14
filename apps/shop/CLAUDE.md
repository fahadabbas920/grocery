# Customer PWA (`@grocery/shop`)

Next.js 16 App Router, installable PWA. Runs on port **3000**.

## PWA

`src/app/manifest.ts` generates the web manifest (installable, standalone).
Add `public/icon-192.png` and `public/icon-512.png` (branding assets).

## Routes

- `/` — catalog browse (`components/catalog-browser.tsx`): search, category filter,
  add-to-cart. Server fetches catalog + image URLs.
- `/cart` — cart + COD checkout (`components/cart-view.tsx`). Cart state lives in
  `lib/cart/cart-context.tsx` (localStorage-persisted).
- `/login` — sign in / sign up (`components/auth-form.tsx`).
- `/orders` — order history (auth-gated).
- `/orders/[id]` — **live tracking** (`components/order-tracker.tsx`): Realtime
  status stepper + rider location on a map. Map provider priority: **Mapbox**
  (`NEXT_PUBLIC_MAPBOX_TOKEN`) → **Google** embed (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)
  → graceful "on the way" message. Renders only when the admin has enabled Maps
  (`app_settings.maps_enabled`) **and** a key/token is set.

## Order placement

`src/app/cart/actions.ts` `placeOrder()` is a Server Action that **recomputes the
total from DB prices** (never trusts the client), checks stock, then inserts the
order + items under RLS. Delivery coords come from the map picker
(`components/location-picker.tsx`, Mapbox bottom-sheet with search + "use my
location"); a plain textarea is the fallback when no Mapbox token is set.

## Supabase access

`src/lib/supabase/server.ts` (cookie-bound) and `client.ts` (browser).
`src/proxy.ts` (Next 16 proxy convention) refreshes the session; the shop itself is public.

## Env (`.env.example` → `.env.local`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a map provider —
`NEXT_PUBLIC_MAPBOX_TOKEN` (primary) and/or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
(fallback). Maps degrade gracefully when neither is set.

## Run

`pnpm -F @grocery/shop dev`
