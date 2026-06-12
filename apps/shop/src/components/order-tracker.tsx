"use client";

import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@grocery/ui";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, REALTIME, type OrderStatus } from "@grocery/shared";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { CheckCircle2, Circle, MapPin, Banknote } from "lucide-react";

interface RiderPos {
  lat: number;
  lng: number;
}

const STATUS_ICONS: Record<string, string> = {
  pending: "🕐",
  confirmed: "✅",
  preparing: "👨‍🍳",
  on_the_way: "🛵",
  delivered: "🎉",
  cancelled: "❌",
};

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

  const isActive = !["delivered", "cancelled"].includes(status);
  const currentStepIndex = ORDER_STATUS_FLOW.indexOf(status);

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
    <div className="mx-auto max-w-lg space-y-4">
      {/* Header card */}
      <div
        className={`rounded-2xl p-5 ${
          isActive
            ? "bg-linear-to-br from-green-600 to-emerald-400"
            : status === "cancelled"
            ? "bg-(--color-muted)"
            : "bg-linear-to-br from-green-700 to-green-500"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Order #{orderId.slice(0, 8)}
            </p>
            <p className="mt-0.5 text-xl font-bold text-white">
              {STATUS_ICONS[status]} {ORDER_STATUS_LABELS[status]}
            </p>
            {isActive && (
              <p className="mt-0.5 text-sm text-white/80">
                Estimated delivery · ~25 min
              </p>
            )}
          </div>
          <OrderStatusBadge status={status} />
        </div>
      </div>

      {/* Vertical timeline stepper */}
      <div className="rounded-2xl border border-(--color-border) bg-(--color-background) p-5">
        <p className="mb-4 text-sm font-semibold text-(--color-foreground)">Order progress</p>
        <ol className="relative space-y-4 border-l-2 border-(--color-border) pl-6">
          {ORDER_STATUS_FLOW.filter((s) => s !== "cancelled").map((step, i) => {
            const completed = i < currentStepIndex;
            const active = i === currentStepIndex && status !== "cancelled";
            return (
              <li key={step} className="relative">
                <span
                  className={`absolute left-[-1.9rem] flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                    completed
                      ? "border-(--color-primary) bg-(--color-primary)"
                      : active
                      ? "border-(--color-primary) bg-white"
                      : "border-(--color-border) bg-(--color-background)"
                  }`}
                >
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : active ? (
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-(--color-primary)" />
                  ) : (
                    <Circle className="h-4 w-4 text-(--color-muted-foreground)" />
                  )}
                </span>
                <p
                  className={`text-sm font-medium ${
                    completed || active ? "text-(--color-foreground)" : "text-(--color-muted-foreground)"
                  }`}
                >
                  {ORDER_STATUS_LABELS[step]}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Order summary */}
      <div className="rounded-2xl border border-(--color-border) bg-(--color-background) p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-(--color-primary)" />
          <p className="text-sm font-semibold text-(--color-foreground)">
            PKR {total.toLocaleString()} · Cash on delivery
          </p>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--color-primary)" />
          <p className="text-sm text-(--color-muted-foreground)">{address}</p>
        </div>
      </div>

      {/* Rider live map */}
      {status === "on_the_way" && mapsAvailable && riderPos && (
        <div className="overflow-hidden rounded-2xl border border-(--color-border)">
          <iframe
            title="Rider location"
            className="h-64 w-full"
            loading="lazy"
            src={`https://www.google.com/maps/embed/v1/view?key=${mapsKey}&center=${riderPos.lat},${riderPos.lng}&zoom=15`}
          />
        </div>
      )}
      {status === "on_the_way" && !mapsAvailable && (
        <div className="rounded-2xl border border-(--color-border) bg-(--color-muted) p-4">
          <p className="text-sm text-(--color-muted-foreground)">
            🛵 Your order is on the way. Live map tracking is currently unavailable.
          </p>
        </div>
      )}
    </div>
  );
}
