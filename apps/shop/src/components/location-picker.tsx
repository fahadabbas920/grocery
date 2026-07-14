"use client";

/**
 * LocationPicker — delivery address picker as a bottom-sheet modal.
 *
 * Provider priority:
 *   1. Mapbox  (NEXT_PUBLIC_MAPBOX_TOKEN)
 *   2. Plain textarea fallback
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Drawer } from "vaul";
import { MapPin, Search, X, Navigation, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { BRAND_GREEN_HEX } from "@grocery/shared";

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 }; // Lahore

// ─── Geolocation (with typed errors) ─────────────────────────────────────────

type LocationError = "permission_denied" | "position_unavailable" | "timeout" | "unsupported";

const LOCATION_ERROR_MESSAGES: Record<LocationError, string> = {
  permission_denied: "Location access was denied. Search for your address instead.",
  position_unavailable: "Your location could not be determined. Search for your address.",
  timeout: "Location request timed out. Try again or search manually.",
  unsupported: "This device does not support location. Search for your address.",
};

function getBrowserLocation(): Promise<
  { ok: true; lat: number; lng: number } | { ok: false; error: LocationError }
> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ ok: false, error: "unsupported" });

    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => {
        if (e.code === e.PERMISSION_DENIED)
          return resolve({ ok: false, error: "permission_denied" });
        if (e.code === e.POSITION_UNAVAILABLE)
          return resolve({ ok: false, error: "position_unavailable" });
        resolve({ ok: false, error: "timeout" });
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}

// ─── Mapbox geocoding helpers ─────────────────────────────────────────────────

async function mapboxReverseGeocode(lat: number, lng: number, token: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
        `?access_token=${token}&types=address,place,neighborhood,locality&limit=1&language=en`,
    );
    if (!res.ok) return "";
    const json = await res.json();
    return json.features?.[0]?.place_name ?? "";
  } catch {
    return "";
  }
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
}

async function mapboxForwardGeocode(query: string, token: string): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?access_token=${token}&country=PK&limit=5&language=en`,
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.features ?? [];
  } catch {
    return [];
  }
}

// ─── Mapbox map (exposes flyTo via ref) ───────────────────────────────────────

interface MapboxMapHandle {
  flyTo: (lat: number, lng: number) => void;
}

const MapboxMap = forwardRef<
  MapboxMapHandle,
  {
    token: string;
    initialCenter: { lat: number; lng: number };
    onPositionChange: (lat: number, lng: number) => void;
  }
>(({ token, initialCenter, onPositionChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerInstanceRef = useRef<mapboxgl.Marker | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo(lat: number, lng: number) {
      markerInstanceRef.current?.setLngLat([lng, lat]);
      mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 800 });
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    import("mapbox-gl").then((mod) => {
      import("mapbox-gl/dist/mapbox-gl.css");
      const mapboxgl = mod.default;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [initialCenter.lng, initialCenter.lat],
        zoom: 14,
      });

      const marker = new mapboxgl.Marker({ draggable: true, color: BRAND_GREEN_HEX })
        .setLngLat([initialCenter.lng, initialCenter.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        onPositionChange(lat, lng);
      });

      map.on("click", (e) => {
        const { lat, lng } = e.lngLat;
        marker.setLngLat([lng, lat]);
        onPositionChange(lat, lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    });

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return <div ref={containerRef} className="h-full w-full" />;
});

MapboxMap.displayName = "MapboxMap";

// ─── Location modal ───────────────────────────────────────────────────────────

function LocationModal({
  token,
  onConfirm,
  onClose,
}: {
  token: string;
  onConfirm: (loc: PickedLocation) => void;
  onClose: () => void;
}) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [address, setAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<MapboxMapHandle>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function reverseGeocode(lat: number, lng: number) {
    setGeocoding(true);
    const addr = await mapboxReverseGeocode(lat, lng, token);
    setAddress(addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setGeocoding(false);
  }

  // Auto-request location on open
  useEffect(() => {
    handleUseMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUseMyLocation() {
    setLocating(true);
    setLocationError(null);

    const result = await getBrowserLocation();

    setLocating(false);

    if (!result.ok) {
      setLocationError(result.error);
      // Still show map at default center so the user can search
      reverseGeocode(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
      return;
    }

    setCenter({ lat: result.lat, lng: result.lng });
    mapRef.current?.flyTo(result.lat, result.lng);
    reverseGeocode(result.lat, result.lng);
  }

  function handlePositionChange(lat: number, lng: number) {
    setCenter({ lat, lng });
    setLocationError(null);
    reverseGeocode(lat, lng);
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchDebounce.current = setTimeout(async () => {
      const results = await mapboxForwardGeocode(q, token);
      setSearchResults(results);
      setSearching(false);
    }, 400);
  }

  function handleSelectResult(result: SearchResult) {
    const [lng, lat] = result.center;
    setCenter({ lat, lng });
    setAddress(result.place_name);
    setSearchQuery(result.place_name);
    setSearchResults([]);
    setLocationError(null);
    mapRef.current?.flyTo(lat, lng);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-(--color-border) px-4 py-3">
        <p className="font-semibold text-(--color-foreground)">Set delivery location</p>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-(--color-muted)"
        >
          <X className="h-4 w-4 text-(--color-muted-foreground)" />
        </button>
      </div>

      {/* Search */}
      <div className="relative shrink-0 border-b border-(--color-border) px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-muted-foreground)" />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-(--color-muted-foreground)" />
          )}
          <input
            type="search"
            placeholder="Search area, street, landmark…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-(--color-border) bg-muted/40 pl-9 pr-4 text-sm placeholder:text-(--color-muted-foreground) focus:border-(--color-ring) focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full z-50 mt-1 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-background) shadow-lg">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => handleSelectResult(r)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-(--color-muted)"
              >
                <MapPin className="h-4 w-4 shrink-0 text-(--color-primary)" />
                <span className="line-clamp-1 text-sm text-(--color-foreground)">
                  {r.place_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use my location */}
      <div className="shrink-0 border-b border-(--color-border) px-4 py-2.5 space-y-1.5">
        <button
          onClick={handleUseMyLocation}
          disabled={locating}
          className="flex items-center gap-2 text-sm font-medium text-(--color-primary) hover:underline disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {locating ? "Fetching your location…" : "Use my current location"}
        </button>

        {locationError && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 px-3 py-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <p className="text-xs text-warning">{LOCATION_ERROR_MESSAGES[locationError]}</p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative flex-1 overflow-hidden">
        <MapboxMap
          ref={mapRef}
          token={token}
          initialCenter={center}
          onPositionChange={handlePositionChange}
        />
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
          <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur-sm whitespace-nowrap">
            Drag pin or tap map to move
          </div>
        </div>
      </div>

      {/* Address + confirm */}
      <div className="shrink-0 border-t border-(--color-border) p-4 space-y-3">
        <div className="flex items-start gap-2 rounded-xl bg-muted/40 px-3 py-2.5 min-h-10">
          {geocoding ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-(--color-primary)" />
          ) : (
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-primary)" />
          )}
          <p className="text-sm text-(--color-foreground)">
            {geocoding ? "Getting address…" : address || "Move the pin to select a location"}
          </p>
        </div>

        <button
          disabled={!address || geocoding}
          onClick={() => onConfirm({ lat: center.lat, lng: center.lng, address })}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-(--color-primary) text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm location
        </button>
      </div>
    </div>
  );
}

// ─── Textarea fallback ────────────────────────────────────────────────────────

function TextareaFallback({
  address,
  onLocationChange,
}: {
  address: string;
  onLocationChange: (loc: PickedLocation) => void;
}) {
  return (
    <textarea
      placeholder="Enter your full delivery address…"
      value={address}
      onChange={(e) => onLocationChange({ lat: 0, lng: 0, address: e.target.value })}
      rows={3}
      className="w-full resize-none rounded-lg border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm placeholder:text-(--color-muted-foreground) focus:border-(--color-ring) focus:outline-none focus:ring-2 focus:ring-ring/20"
    />
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

interface LocationPickerProps {
  onLocationChange: (loc: PickedLocation) => void;
  address: string;
  lat?: number;
  lng?: number;
}

export function LocationPicker({
  onLocationChange,
  address,
  lat = 0,
  lng = 0,
}: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const callbackRef = useRef(onLocationChange);
  useEffect(() => {
    callbackRef.current = onLocationChange;
  }, [onLocationChange]);
  const stableCallback = useCallback((loc: PickedLocation) => callbackRef.current(loc), []);

  const hasLocation = lat !== 0 && lng !== 0 && address.trim().length > 0;

  if (!mapboxToken) {
    return <TextareaFallback address={address} onLocationChange={stableCallback} />;
  }

  const previewUrl = hasLocation
    ? `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
      `pin-s+16a34a(${lng},${lat})/${lng},${lat},14,0/600x200@2x` +
      `?access_token=${mapboxToken}`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full overflow-hidden rounded-xl border border-(--color-border) bg-(--color-background) text-left transition-colors hover:bg-muted/40"
      >
        {/* Static map preview (shown once a location is confirmed) */}
        {previewUrl && (
          <div className="relative h-32 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Delivery location map"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
              Tap to change
            </div>
          </div>
        )}

        {/* Address row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-(--color-primary)" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-(--color-muted-foreground)">Delivery location</p>
            <p className="truncate text-sm font-medium text-(--color-foreground)">
              {address || "Tap to set your location"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-(--color-muted-foreground)" />
        </div>
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-(--color-background) outline-none"
            style={{ height: "90dvh" }}
          >
            <Drawer.Title className="sr-only">Set delivery location</Drawer.Title>
            <LocationModal
              token={mapboxToken}
              onClose={() => setOpen(false)}
              onConfirm={(loc) => {
                stableCallback(loc);
                setOpen(false);
              }}
            />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
