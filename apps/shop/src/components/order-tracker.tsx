"use client";

import { useEffect, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
import {
  BRAND_GREEN_HEX,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_SUBTITLES,
  REALTIME,
  formatOrderCode,
  type MapProvider,
  type OrderStatus,
} from "@grocery/shared";
import { ORDER_STATUS_CONFIG, OrderStatusBadge } from "@grocery/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { MapPin, Banknote, CheckCircle2, ShoppingBag, Store } from "lucide-react";

interface RiderPos {
  lat: number;
  lng: number;
}

/** One per-shop child order within the customer's parent order. */
export interface ChildOrder {
  id: string;
  storeName: string;
  status: OrderStatus;
  riderId: string | null;
}

const PROGRESS: OrderStatus[] = ["placed", "preparing", "on_the_way", "delivered"];

/** Derive an overall status for the parent from its children (least-advanced active). */
function deriveOverall(children: ChildOrder[]): OrderStatus {
  if (children.length === 0) return "placed";
  if (children.every((c) => c.status === "delivered")) return "delivered";
  if (children.every((c) => c.status === "cancelled")) return "cancelled";
  const active = children.filter((c) => c.status !== "cancelled");
  return active.reduce<OrderStatus>(
    (min, c) => (PROGRESS.indexOf(c.status) < PROGRESS.indexOf(min) ? c.status : min),
    "delivered",
  );
}

/**
 * RiderMap — shows the live rider location, using the public rendering token
 * from `app_settings.maps_public_token` (via the `mapsConfig` prop). Never a
 * build-time env var — ops can rotate this from the Settings page.
 */
function RiderMap({
  pos,
  mapsConfig,
}: {
  pos: RiderPos;
  mapsConfig: { provider: MapProvider; publicToken: string | null };
}) {
  if (mapsConfig.provider === "mapbox" && mapsConfig.publicToken) {
    return <MapboxRiderMap token={mapsConfig.publicToken} pos={pos} />;
  }
  if (mapsConfig.provider === "google" && mapsConfig.publicToken) {
    return (
      <iframe
        title="Rider location"
        className="h-64 w-full"
        loading="lazy"
        src={`https://www.google.com/maps/embed/v1/view?key=${mapsConfig.publicToken}&center=${pos.lat},${pos.lng}&zoom=15`}
      />
    );
  }
  return null;
}

function MapboxRiderMap({ token, pos }: { token: string; pos: RiderPos }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    import("mapbox-gl").then((mapboxgl) => {
      import("mapbox-gl/dist/mapbox-gl.css");
      mapboxgl.default.accessToken = token;

      if (!mapRef.current && containerRef.current) {
        mapRef.current = new mapboxgl.default.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [pos.lng, pos.lat],
          zoom: 15,
        });
        markerRef.current = new mapboxgl.default.Marker({ color: BRAND_GREEN_HEX })
          .setLngLat([pos.lng, pos.lat])
          .addTo(mapRef.current);
      }
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Update marker position when rider moves
  useEffect(() => {
    markerRef.current?.setLngLat([pos.lng, pos.lat]);
    mapRef.current?.easeTo({ center: [pos.lng, pos.lat], duration: 800 });
  }, [pos.lat, pos.lng]);

  return <div ref={containerRef} className="h-64 w-full" />;
}

function HorizontalStepper({ status }: { status: OrderStatus }) {
  const steps = ORDER_STATUS_FLOW as readonly OrderStatus[];
  const currentIndex = steps.indexOf(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="rounded-2xl border border-(--color-border) bg-(--color-background) px-5 py-6">
      <p className="mb-5 text-xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
        Order progress
      </p>
      <div className="relative flex items-start justify-between">
        {/* connector line */}
        <div className="absolute left-0 right-0 top-3.25 h-0.5 bg-(--color-border)" />
        <div
          className="absolute left-0 top-3.25 h-0.5 bg-(--color-primary) transition-all duration-700"
          style={{
            width: isCancelled
              ? "0%"
              : status === "delivered"
                ? "100%"
                : currentIndex <= 0
                  ? "0%"
                  : `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, i) => {
          const completed =
            !isCancelled && (i < currentIndex || (status === "delivered" && i === currentIndex));
          const active = !isCancelled && i === currentIndex && status !== "delivered";
          return (
            <div
              key={step}
              className="relative z-10 flex flex-col items-center gap-2"
              style={{ width: `${100 / steps.length}%` }}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  completed
                    ? "border-(--color-primary) bg-(--color-primary)"
                    : active
                      ? "border-(--color-primary) bg-white"
                      : "border-(--color-border) bg-(--color-background)"
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                ) : active ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-(--color-primary)" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-(--color-border)" />
                )}
              </span>
              <p
                className={`text-center text-[10px] font-medium leading-tight ${
                  completed || active
                    ? "text-(--color-foreground)"
                    : "text-(--color-muted-foreground)"
                }`}
              >
                {ORDER_STATUS_LABELS[step]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderTracker({
  orderId,
  initialChildren,
  total,
  address,
  mapsConfig,
}: {
  orderId: string;
  initialChildren: ChildOrder[];
  total: number;
  address: string;
  mapsConfig: { enabled: boolean; provider: MapProvider; publicToken: string | null };
}) {
  const [children, setChildren] = useState<ChildOrder[]>(initialChildren);
  const [riderPos, setRiderPos] = useState<Record<string, RiderPos>>({});
  const mapsAvailable =
    mapsConfig.enabled && mapsConfig.provider !== "none" && !!mapsConfig.publicToken;

  const status = deriveOverall(children);
  const cfg = ORDER_STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const isActive = !["delivered", "cancelled"].includes(status);
  const single = children.length === 1;

  // Live per-shop status: all children of this parent order.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`${REALTIME.orderStatusChannel}:${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_orders", filter: `order_id=eq.${orderId}` },
        (payload) => {
          const row = payload.new as { id: string; status: OrderStatus; rider_id: string | null };
          setChildren((prev) =>
            prev.map((c) =>
              c.id === row.id ? { ...c, status: row.status, riderId: row.rider_id } : c,
            ),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Live rider locations. RLS scopes rows to the riders on this customer's active order.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`${REALTIME.riderLocationsChannel}:${orderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_locations" },
        (payload) => {
          const row = payload.new as { rider_id: string; lat: number; lng: number };
          setRiderPos((prev) => ({ ...prev, [row.rider_id]: { lat: row.lat, lng: row.lng } }));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      {/* Hero status card (overall) */}
      <div
        className={`overflow-hidden rounded-2xl bg-linear-to-br ${cfg.gradient} p-6 text-center`}
      >
        <div
          className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20`}
        >
          <StatusIcon className="h-8 w-8 text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Your order status is
        </p>
        <p className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-white">
          {ORDER_STATUS_LABELS[status]}
        </p>
        <p className="mt-1 text-sm text-white/80">{ORDER_STATUS_SUBTITLES[status]}</p>

        <div className="mx-auto mt-4 inline-block rounded-xl bg-white/20 px-5 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/70">Order Number</p>
          <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-white">
            {formatOrderCode(orderId)}
          </p>
        </div>

        {isActive && <p className="mt-3 text-xs text-white/60">Estimated delivery · ~25 min</p>}
      </div>

      {/* Single-shop order: full progress stepper. */}
      {single && children[0] && children[0].status !== "cancelled" && (
        <HorizontalStepper status={children[0].status} />
      )}

      {/* Per-shop breakdown (shown for multi-shop orders). */}
      {!single && (
        <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-background)">
          <div className="border-b border-(--color-border) px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
              Shops in this order
            </p>
          </div>
          <div className="divide-y divide-(--color-border)">
            {children.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-(--color-muted-foreground)" />
                  <span className="text-sm font-medium text-(--color-foreground)">
                    {c.storeName}
                  </span>
                </div>
                <OrderStatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivery details */}
      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-background)">
        <div className="border-b border-(--color-border) px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
            Delivery details
          </p>
        </div>
        <div className="divide-y divide-(--color-border)">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-(--color-primary)">
              <Banknote className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-(--color-muted-foreground)">Payment</p>
              <p className="text-sm font-semibold text-(--color-foreground)">
                PKR {total.toLocaleString()} · Cash on delivery
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-(--color-primary)">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-(--color-muted-foreground)">Delivery address</p>
              <p className="text-sm font-medium text-(--color-foreground)">{address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Live rider map(s) — one per shop that's on the way. */}
      {children
        .filter((c) => c.status === "on_the_way")
        .map((c) => {
          const pos = c.riderId ? riderPos[c.riderId] : undefined;
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-(--color-border)">
              <div className="border-b border-(--color-border) px-5 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
                  Live rider location{single ? "" : ` · ${c.storeName}`}
                </p>
              </div>
              {mapsAvailable && pos ? (
                <RiderMap pos={pos} mapsConfig={mapsConfig} />
              ) : (
                <div className="bg-muted/40 p-4 text-center">
                  <p className="text-sm text-(--color-muted-foreground)">
                    🛵 On the way{mapsAvailable ? " — locating rider…" : ". Live map unavailable."}
                  </p>
                </div>
              )}
            </div>
          );
        })}

      {/* Continue shopping */}
      <Link
        href="/"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-(--color-primary) py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
      >
        <ShoppingBag className="h-4 w-4" />
        Continue Shopping
      </Link>
    </div>
  );
}
