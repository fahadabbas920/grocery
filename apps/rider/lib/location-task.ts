import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { RIDER_GPS_THROTTLE_MS } from "@grocery/shared";
import { supabase } from "./supabase";

export const LOCATION_TASK = "grocery-rider-location";

/**
 * Background location (TaskManager + foreground service) is NOT available in
 * Expo Go — it requires a development/production build. We detect Expo Go and
 * no-op the GPS calls so the rest of the app remains testable in Expo Go.
 */
export const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Background location task: upserts the rider's current position to
 * rider_locations. RLS restricts the upsert to the rider's own row.
 * Skipped entirely in Expo Go (background tasks aren't supported there).
 */
if (!IS_EXPO_GO) {
  TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn("Location task error:", error.message);
      return;
    }
    const { locations } = (data ?? {}) as { locations?: Location.LocationObject[] };
    const latest = locations?.[locations.length - 1];
    if (!latest) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("rider_locations").upsert(
      {
        rider_id: user.id,
        lat: latest.coords.latitude,
        lng: latest.coords.longitude,
      },
      { onConflict: "rider_id" },
    );
  });
}

/**
 * Start sharing location (foreground + background) during an active delivery.
 * Returns false (and warns) in Expo Go, where background location is unavailable —
 * the caller treats this as "GPS not started" without crashing.
 */
export async function startLocationSharing(): Promise<boolean> {
  if (IS_EXPO_GO) {
    console.warn(
      "[rider] Background GPS is disabled in Expo Go. Use a development build to test live tracking.",
    );
    return false;
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") return false;

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (already) return true;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: RIDER_GPS_THROTTLE_MS,
    distanceInterval: 25,
    foregroundService: {
      notificationTitle: "BasketBee Rider",
      notificationBody: "Sharing your location for live delivery tracking.",
    },
  });
  return true;
}

export async function stopLocationSharing(): Promise<void> {
  if (IS_EXPO_GO) return;
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}
