# Supabase Backend

Postgres + Auth + Realtime + Storage. Configured entirely via in-repo migrations
so the backend is reproducible (`supabase db push`).

## Schema (migrations, applied in filename order)

1. `..._init_auth_profiles.sql` — `user_role`/`order_status` enums; `profiles`
   (1:1 with `auth.users`); `auth_role()` helper (SECURITY DEFINER); auto-create
   profile trigger on signup.
2. `..._catalog.sql` — `categories`, `products`, `inventory` (1:1 with product,
   auto-created); `touch_updated_at` trigger.
3. `..._orders.sql` — `orders`, `order_items`, `order_status_history`;
   **status-transition guard** trigger (mirrors `packages/shared/orderStatus.ts`);
   status-history logging trigger.
4. `..._rider_locations.sql` — one upserted row per rider.
5. `..._rls_policies.sql` — RLS on every table, deny-by-default. See below.
6. `..._realtime.sql` — enables Realtime on `orders`, `order_status_history`,
   `rider_locations`.
7. `..._storage.sql` — `product-images` (public read, ops write) and
   `profile-avatars` (owner-only) buckets + policies.
8. `..._app_settings.sql` — runtime feature flags (key→jsonb). Read by any
   authenticated user, written by admins only. Seeds `maps_enabled = false`.

## RLS model (`auth_role()` reads caller role)

- **customer** — own profile + own orders/items; rider info & location of their
  assigned active order.
- **rider** — assigned orders (read + advance status); upsert own location.
- **stock_keeper** — full catalog/inventory; all orders (prep).
- **admin** — everything, including role elevation (guarded by `guard_profile_role`).

## Storage

Bucket names mirror `packages/shared` `STORAGE_BUCKETS`. Product image URLs use
Supabase Storage transforms (resize/quality) — see `packages/db/src/storage.ts`.

## Edge Functions

- `on-order-assigned` — notification hook (stub; extend for push/SMS).
- `cleanup-product-image` — deletes orphaned storage objects.
  Deploy: `supabase functions deploy <name>`.

## Workflow

```
supabase link --project-ref <ref>   # one-time
supabase db push                    # apply migrations
supabase db lint                    # validate SQL
supabase functions deploy on-order-assigned
pnpm db:types                       # regenerate TS types (from repo root)
```

Edge functions read `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from the function
environment (auto-injected) — never hardcoded.
