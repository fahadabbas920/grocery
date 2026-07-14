/** Cross-surface constants. No secrets here — these are non-sensitive identifiers. */

export const USER_ROLES = ["customer", "stock_keeper", "rider", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Roles permitted into the Ops Console (apps/ops). */
export const OPS_ROLES: readonly UserRole[] = ["admin", "stock_keeper"];

/** Supabase Storage bucket names. */
export const STORAGE_BUCKETS = {
  productImages: "product-images",
  profileAvatars: "profile-avatars",
} as const;

/** Realtime channel / topic names, kept consistent across publishers and subscribers. */
export const REALTIME = {
  ordersChannel: "orders",
  orderStatusChannel: "order_status",
  riderLocationsChannel: "rider_locations",
} as const;

/** Rider GPS sampling: write at most this often while a delivery is active (ms). */
export const RIDER_GPS_THROTTLE_MS = 10_000;

/**
 * Brand green as a concrete hex — for contexts that can't use CSS tokens:
 * the PWA manifest/theme-color and non-CSS map SDK marker colors. Keep in sync
 * with `--primary` in packages/ui/src/styles/globals.css.
 */
export const BRAND_GREEN_HEX = "#16a34a";

/** Keys for the `app_settings` table (runtime feature flags). */
export const SETTING_KEYS = {
  mapsEnabled: "maps_enabled",
} as const;

/** Default Supabase Storage image transform for catalog thumbnails. */
export const PRODUCT_IMAGE_TRANSFORM = {
  width: 400,
  height: 400,
  resize: "cover",
  quality: 75,
} as const;
