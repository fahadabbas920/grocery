"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OrderStatusBadge, EmptyState } from "@grocery/ui";
import { formatOrderCode, type OrderStatus } from "@grocery/shared";
import { Bike, Clock, MapPin, Store as StoreIcon } from "lucide-react";
import { assignRider, logAdminAction } from "@grocery/db/queries";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DispatchOrder {
  id: string;
  status: OrderStatus;
  storeName: string;
  address: string;
  rider_id: string | null;
  created_at: string;
}
interface Rider {
  id: string;
  full_name: string;
  phone: string | null;
}
interface Loc {
  rider_id: string;
  updated_at: string;
}

function ago(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function DispatchBoard({
  actorId,
  stores,
  activeStoreId,
  initialOrders,
  riders,
  locations,
}: {
  /** The signed-in admin's profile id, for audit logging. */
  actorId: string;
  stores: { id: string; name: string }[];
  activeStoreId: string | null;
  initialOrders: DispatchOrder[];
  riders: Rider[];
  locations: Loc[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const lastSeen = new Map(locations.map((l) => [l.rider_id, l.updated_at]));

  async function assign(orderId: string, riderId: string) {
    setBusy(orderId);
    const rider = riders.find((r) => r.id === riderId);
    try {
      const supabase = getBrowserSupabase();
      await assignRider(supabase, orderId, riderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, rider_id: riderId } : o)));
      toast.success(`${rider?.full_name ?? "Rider"} assigned`);
      // Best-effort audit trail; never block the primary action on logging.
      logAdminAction(supabase, actorId, "dispatch.assign_rider", {
        store_order_id: orderId,
        rider_id: riderId,
        rider_name: rider?.full_name ?? null,
      }).catch(() => {});
      router.refresh();
    } catch {
      toast.error("Failed to assign rider");
    } finally {
      setBusy(null);
    }
  }

  const unassigned = orders.filter((o) => !o.rider_id).length;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Active orders */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
            Active orders · {unassigned} awaiting rider
          </p>
          <Select
            value={activeStoreId ?? "all"}
            onValueChange={(v) => router.push(v === "all" ? "/dispatch" : `/dispatch?store=${v}`)}
          >
            <SelectTrigger className="h-8 w-44 rounded-lg text-xs">
              <SelectValue placeholder="All shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All shops</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={<Bike className="h-6 w-6" />} title="No active orders" />
        ) : (
          orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-(--color-border) bg-(--color-card) px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-(--color-foreground)">
                    #{formatOrderCode(o.id)}
                  </span>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-(--color-muted-foreground)">
                  <span className="flex items-center gap-1">
                    <StoreIcon className="h-3 w-3" />
                    {o.storeName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {ago(o.created_at)}
                  </span>
                  {o.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="max-w-40 truncate">{o.address}</span>
                    </span>
                  )}
                </div>
              </div>
              <Select
                value={o.rider_id ?? ""}
                onValueChange={(v) => assign(o.id, v)}
                disabled={busy === o.id}
              >
                <SelectTrigger className="h-9 w-44 rounded-lg text-sm">
                  <SelectValue placeholder="Assign rider…" />
                </SelectTrigger>
                <SelectContent>
                  {riders.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))
        )}
      </div>

      {/* Rider roster */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
          Riders
        </p>
        {riders.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">No riders yet.</p>
        ) : (
          <div className="space-y-2">
            {riders.map((r) => {
              const seen = lastSeen.get(r.id);
              const activeCount = orders.filter((o) => o.rider_id === r.id).length;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-card) px-3 py-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-muted) text-xs font-bold">
                    {r.full_name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-(--color-foreground)">
                      {r.full_name}
                    </p>
                    <p className="text-xs text-(--color-muted-foreground)">
                      {activeCount} active · {seen ? `seen ${ago(seen)}` : "no location yet"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
