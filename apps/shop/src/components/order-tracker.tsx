"use client";

import { useEffect, useState } from "react";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, REALTIME, type OrderStatus } from "@grocery/shared";
import { ORDER_STATUS_CONFIG } from "@grocery/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";
import Link from "next/link";
import { MapPin, Banknote, CheckCircle2, ShoppingBag } from "lucide-react";

interface RiderPos {
  lat: number;
  lng: number;
}

const STATUS_SUBTITLES: Record<OrderStatus, string> = {
  placed:     "We've received your order and will start preparing it shortly.",
  preparing:  "Your order is being carefully prepared.",
  on_the_way: "Your order is out for delivery. Hang tight!",
  delivered:  "Your order has been delivered successfully.",
  cancelled:  "This order was cancelled.",
};

function formatOrderCode(id: string) {
  const upper = id.replace(/-/g, "").toUpperCase().slice(0, 8);
  return `${upper.slice(0, 4)}-${upper.slice(4)}`;
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
          const completed = !isCancelled && (i < currentIndex || (status === "delivered" && i === currentIndex));
          const active = !isCancelled && i === currentIndex && status !== "delivered";
          return (
            <div key={step} className="relative z-10 flex flex-col items-center gap-2" style={{ width: `${100 / steps.length}%` }}>
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
                  completed || active ? "text-(--color-foreground)" : "text-(--color-muted-foreground)"
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
  initialStatus,
  riderId,
  total,
  address,
  mapsEnabled,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  riderId: string | null;
  total: number;
  address: string;
  mapsEnabled: boolean;
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [riderPos, setRiderPos] = useState<RiderPos | null>(null);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsAvailable = mapsEnabled && Boolean(mapsKey);

  const cfg = ORDER_STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const isActive = !["delivered", "cancelled"].includes(status);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`${REALTIME.orderStatusChannel}:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setStatus((payload.new as { status: OrderStatus }).status),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    if (!riderId) return;
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`${REALTIME.riderLocationsChannel}:${riderId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_locations", filter: `rider_id=eq.${riderId}` },
        (payload) => {
          const row = payload.new as RiderPos;
          setRiderPos({ lat: row.lat, lng: row.lng });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [riderId]);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-10">
      {/* Hero status card */}
      <div className={`overflow-hidden rounded-2xl bg-linear-to-br ${cfg.gradient} p-6 text-center`}>
        <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20`}>
          <StatusIcon className="h-8 w-8 text-white" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Your order status is
        </p>
        <p className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-white">
          {ORDER_STATUS_LABELS[status]}
        </p>
        <p className="mt-1 text-sm text-white/80">{STATUS_SUBTITLES[status]}</p>

        {/* Order code chip */}
        <div className="mx-auto mt-4 inline-block rounded-xl bg-white/20 px-5 py-3 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/70">Order Number</p>
          <p className="mt-0.5 font-mono text-lg font-bold tracking-widest text-white">
            {formatOrderCode(orderId)}
          </p>
        </div>

        {isActive && (
          <p className="mt-3 text-xs text-white/60">
            Estimated delivery · ~25 min
          </p>
        )}
      </div>

      {/* Horizontal progress stepper */}
      {status !== "cancelled" && <HorizontalStepper status={status} />}

      {/* Delivery details */}
      <div className="overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-background)">
        <div className="border-b border-(--color-border) px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
            Delivery details
          </p>
        </div>
        <div className="divide-y divide-(--color-border)">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-primary)/10 text-(--color-primary)">
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--color-primary)/10 text-(--color-primary)">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-(--color-muted-foreground)">Delivery address</p>
              <p className="text-sm font-medium text-(--color-foreground)">{address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rider live map */}
      {status === "on_the_way" && mapsAvailable && riderPos && (
        <div className="overflow-hidden rounded-2xl border border-(--color-border)">
          <div className="border-b border-(--color-border) px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-(--color-muted-foreground)">
              Live rider location
            </p>
          </div>
          <iframe
            title="Rider location"
            className="h-64 w-full"
            loading="lazy"
            src={`https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${riderPos.lat},${riderPos.lng}&zoom=15`}
          />
        </div>
      )}
      {status === "on_the_way" && !mapsAvailable && (
        <div className="rounded-2xl border border-(--color-border) bg-muted/40 p-4 text-center">
          <p className="text-sm text-(--color-muted-foreground)">
            🛵 Your order is on the way. Live map tracking is currently unavailable.
          </p>
        </div>
      )}

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
