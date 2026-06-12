# Rider App (`@grocery/rider`)

Expo SDK 54 (React Native 0.81) + Expo Router. Distributed as an **APK** (no store).

> **SDK 54** (not the bleeding-edge 56) so it matches the Expo Go available on the
> Play/App Store — the UI (login, orders, navigation) can be tested in Expo Go
> directly. **Background GPS does NOT run in Expo Go** (it needs a dev/EAS build);
> `lib/location-task.ts` detects Expo Go (`IS_EXPO_GO`) and no-ops the GPS calls so
> the app still loads there. Test live tracking with a development build.

## Screens (`app/`)
- `_layout.tsx` — auth gate (redirects to `/login` when signed out); registers the
  background location task at startup.
- `login.tsx` — rider sign-in.
- `index.tsx` — assigned active orders (pull-to-refresh).
- `order/[id].tsx` — order detail: Google Maps navigation deep link, "Start delivery"
  (→ `on_the_way` + begin GPS sharing), "Mark delivered" (→ `delivered` + stop GPS).

## Background GPS
`lib/location-task.ts` defines a `TaskManager` task that upserts the rider's position
to `rider_locations` (RLS restricts to own row), throttled by
`RIDER_GPS_THROTTLE_MS` from `@grocery/shared`. Requires foreground + background
location permission (declared in `app.json`, Android foreground service).
In Expo Go this is skipped (`IS_EXPO_GO` guard) — only a dev/EAS build runs it.

## Supabase
`lib/supabase.ts` wraps `@grocery/db/native` (AsyncStorage session).

## Monorepo notes
`metro.config.js` watches the workspace root and follows pnpm symlinks so shared
packages hot-reload.

## Env (`.env.example` → `.env`)
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Run / build
```
pnpm -F @grocery/rider dev          # Expo dev server
pnpm -F @grocery/rider build:apk    # eas build -p android --profile preview (APK)
```
Set the EAS `projectId` in `app.json` and run `eas login` before building.
