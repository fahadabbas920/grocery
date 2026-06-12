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
  status stepper + rider location on a Google Maps embed. The map renders only when
  the admin has enabled Maps (`app_settings.maps_enabled`) **and** a key is set;
  otherwise it gracefully shows an "on the way" message.

## Order placement
`src/app/cart/actions.ts` `placeOrder()` is a Server Action that **recomputes the
total from DB prices** (never trusts the client), checks stock, then inserts the
order + items under RLS. Delivery coords come from the browser geolocation API
(MVP — replace with a map picker).

## Supabase access
`src/lib/supabase/server.ts` (cookie-bound) and `client.ts` (browser).
`src/proxy.ts` (Next 16 proxy convention) refreshes the session; the shop itself is public.

## Env (`.env.example` → `.env.local`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Run
`pnpm -F @grocery/shop dev`
