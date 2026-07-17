"use client";

import { useEffect, useState } from "react";
import { Button, OrderStatusBadge, EmptyState, ORDER_STATUS_CONFIG } from "@grocery/ui";
import {
  ORDER_STATUS_TRANSITIONS,
  REALTIME,
  ORDER_STATUS_LABELS,
  formatOrderCode,
  type OrderStatus,
} from "@grocery/shared";
import { toast } from "sonner";
import {
  Check,
  Clock,
  MapPin,
  Phone,
  ShoppingBag,
  Store,
  User,
  UserCheck,
  Zap,
} from "lucide-react";
import { assignRider as assignRiderDb, updateOrderStatus } from "@grocery/db/queries";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@grocery/ui/components/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// A per-shop child order (store_orders) as shown on the board.
interface OrderRow {
  id: string;
  status: OrderStatus;
  subtotal: number;
  address: string;
  storeName: string | null;
  rider_id: string | null;
  created_at: string;
}

interface Rider {
  id: string;
  full_name: string;
  phone: string | null;
}

type TabFilter = "all" | "active" | "delivered" | "cancelled";

/**
 * Normalize a raw `store_orders` row from a realtime payload. PostgREST delivers
 * `numeric` (subtotal) as a string. Joined fields (address, store name) aren't in the
 * raw payload — merged rows preserve them; freshly-inserted rows show them after refresh.
 */
function normalizeOrder(raw: Record<string, unknown>): OrderRow {
  return {
    id: raw.id as string,
    status: raw.status as OrderStatus,
    subtotal: Number(raw.subtotal),
    address: "",
    storeName: null,
    rider_id: (raw.rider_id as string | null) ?? null,
    created_at: raw.created_at as string,
  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm">
      <span className="text-xs font-medium text-(--color-muted-foreground)">{label}</span>
      <span className="text-2xl font-bold text-(--color-foreground)" style={{ color }}>
        {value}
      </span>
      {sub && <span className="text-xs text-(--color-muted-foreground)">{sub}</span>}
    </div>
  );
}

export function OrdersBoard({
  admin,
  initialOrders,
  riders,
}: {
  admin: boolean;
  initialOrders: OrderRow[];
  riders: Rider[];
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState<TabFilter>("all");
  const [mutating, setMutating] = useState<Set<string>>(new Set());
  const [riderDialogOrderId, setRiderDialogOrderId] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  const isMutating = (key: string) => mutating.has(key);
  const beginMutating = (key: string) => setMutating((s) => new Set(s).add(key));
  const endMutating = (key: string) =>
    setMutating((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });

  useEffect(() => {
    // Subscribe to the per-shop child orders. RLS scopes a vendor to their own store.
    const channel = supabase
      .channel(REALTIME.ordersChannel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_orders" },
        (payload) => {
          setOrders((prev) => {
            if (payload.eventType === "DELETE") {
              const removed = payload.old as { id: string };
              return prev.filter((o) => o.id !== removed.id);
            }
            const row = normalizeOrder(payload.new);
            if (payload.eventType === "INSERT") return [row, ...prev];
            // UPDATE: merge only the mutable fields; keep joined address/storeName.
            return prev.map((o) =>
              o.id === row.id
                ? { ...o, status: row.status, subtotal: row.subtotal, rider_id: row.rider_id }
                : o,
            );
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function assignRider(storeOrderId: string, riderId: string) {
    const key = `rider:${storeOrderId}`;
    if (isMutating(key)) return;
    beginMutating(key);
    setRiderDialogOrderId(null);
    try {
      await assignRiderDb(supabase, storeOrderId, riderId);
      const rider = riders.find((r) => r.id === riderId);
      toast.success(`${rider?.full_name ?? "Rider"} assigned`);
    } catch {
      toast.error("Failed to assign rider");
    } finally {
      endMutating(key);
    }
  }

  async function advanceStatus(storeOrderId: string, next: OrderStatus) {
    const key = `status:${storeOrderId}:${next}`;
    if (isMutating(key)) return;
    beginMutating(key);
    try {
      await updateOrderStatus(supabase, storeOrderId, next);
      toast.success(`Order → ${ORDER_STATUS_LABELS[next]}`);
    } catch {
      toast.error("Failed to update order");
    } finally {
      endMutating(key);
    }
  }

  const activeOrders = orders.filter((o) =>
    ["placed", "preparing", "on_the_way"].includes(o.status),
  );
  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.subtotal, 0);

  const filtered = orders.filter((o) => {
    if (tab === "active") return ["placed", "preparing", "on_the_way"].includes(o.status);
    if (tab === "delivered") return o.status === "delivered";
    if (tab === "cancelled") return o.status === "cancelled";
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="flex gap-3">
        <StatCard label="Orders" value={orders.length} color="var(--color-foreground)" />
        <StatCard
          label="Active"
          value={activeOrders.length}
          sub="in progress"
          color="var(--color-warning)"
        />
        <StatCard
          label="Revenue"
          value={`PKR ${revenue.toLocaleString()}`}
          sub="delivered only"
          color="var(--color-success)"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
        <TabsList className="h-10 rounded-xl p-1">
          <TabsTrigger value="all" className="rounded-lg px-4 text-sm">
            All{" "}
            <span className="ml-1.5 rounded-full bg-(--color-muted) px-1.5 py-0.5 text-xs font-semibold">
              {orders.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg px-4 text-sm">
            Active{" "}
            <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-xs font-semibold text-warning">
              {activeOrders.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="rounded-lg px-4 text-sm">
            Delivered{" "}
            <span className="ml-1.5 rounded-full bg-success/15 px-1.5 py-0.5 text-xs font-semibold text-success">
              {orders.filter((o) => o.status === "delivered").length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg px-4 text-sm">
            Cancelled{" "}
            <span className="ml-1.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-xs font-semibold text-destructive">
              {orders.filter((o) => o.status === "cancelled").length}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Order list */}
      <ScrollArea className="h-[calc(100vh-340px)]">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title="No orders here"
            description="Orders will appear here as they come in."
          />
        ) : (
          <div className="flex flex-col gap-3 pr-4">
            {filtered.map((order) => {
              const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];
              const statusCfg = ORDER_STATUS_CONFIG[order.status];
              const StatusIcon = statusCfg.icon;
              const assignedRider = riders.find((r) => r.id === order.rider_id);
              return (
                <div
                  key={order.id}
                  className={`group relative overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-card) shadow-sm transition-shadow hover:shadow-md ${statusCfg.cardBg}`}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
                    style={{ backgroundColor: statusCfg.hex }}
                  />

                  <div className="pl-4">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-4 px-4 pt-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ backgroundColor: statusCfg.hex }}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-(--color-foreground)">
                              #{formatOrderCode(order.id)}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-(--color-muted-foreground)">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo(order.created_at)}
                            </span>
                            {/* Admin sees which shop the order belongs to. */}
                            {admin && order.storeName && (
                              <span className="flex items-center gap-1">
                                <Store className="h-3 w-3" />
                                {order.storeName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-(--color-foreground)">
                          PKR {order.subtotal.toLocaleString()}
                        </p>
                        {assignedRider && (
                          <div className="mt-0.5 flex items-center justify-end gap-1 text-xs text-(--color-muted-foreground)">
                            <User className="h-3 w-3" />
                            {assignedRider.full_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    {order.address && (
                      <div className="mt-3 flex items-start gap-1.5 px-4">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--color-muted-foreground)" />
                        <p className="text-sm text-(--color-foreground) line-clamp-1">
                          {order.address}
                        </p>
                      </div>
                    )}

                    {/* Actions row */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 bg-card/60 px-4 py-3">
                      {/* Rider assignment — central dispatch (admin only). Vendors see the
                          assigned rider read-only in the card header above. */}
                      {admin ? (
                        <button
                          disabled={
                            order.status === "cancelled" ||
                            order.status === "delivered" ||
                            isMutating(`rider:${order.id}`)
                          }
                          onClick={() => setRiderDialogOrderId(order.id)}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-(--color-border) bg-(--color-background) px-3 text-sm text-(--color-foreground) transition-colors hover:bg-(--color-muted) disabled:pointer-events-none disabled:opacity-50"
                        >
                          {assignedRider ? (
                            <UserCheck className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <User className="h-3.5 w-3.5 text-(--color-muted-foreground)" />
                          )}
                          <span className="max-w-32 truncate">
                            {assignedRider ? assignedRider.full_name : "Assign rider"}
                          </span>
                        </button>
                      ) : (
                        <span className="flex h-8 items-center gap-1.5 rounded-lg px-1 text-sm text-(--color-muted-foreground)">
                          {assignedRider ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5 text-success" />
                              <span className="max-w-32 truncate">{assignedRider.full_name}</span>
                            </>
                          ) : (
                            <>
                              <User className="h-3.5 w-3.5" />
                              <span>Awaiting rider</span>
                            </>
                          )}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        {nextStatuses.map((status) => {
                          const key = `status:${order.id}:${status}`;
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === "cancelled" ? "destructive" : "default"}
                              className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                              disabled={isMutating(key)}
                              onClick={() => advanceStatus(order.id, status)}
                            >
                              {status !== "cancelled" && <Zap className="h-3 w-3" />}
                              {isMutating(key) ? "Saving…" : ORDER_STATUS_LABELS[status]}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Rider picker dialog (admin only) */}
      {admin &&
        (() => {
          const dialogOrder = riderDialogOrderId
            ? orders.find((o) => o.id === riderDialogOrderId)
            : null;
          return (
            <Dialog
              open={!!riderDialogOrderId}
              onOpenChange={(open) => !open && setRiderDialogOrderId(null)}
            >
              <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3 border-b border-(--color-border)">
                  <DialogTitle className="text-base">Assign rider</DialogTitle>
                  {dialogOrder && (
                    <DialogDescription className="text-xs">
                      Order #{formatOrderCode(dialogOrder.id)} · PKR{" "}
                      {dialogOrder.subtotal.toLocaleString()}
                    </DialogDescription>
                  )}
                </DialogHeader>

                <div className="flex flex-col gap-1.5 p-3 max-h-80 min-h-32 overflow-y-auto">
                  {riders.length === 0 && (
                    <p className="py-6 text-center text-sm text-(--color-muted-foreground)">
                      No riders available.
                    </p>
                  )}
                  {riders.map((rider) => {
                    const isAssigned = dialogOrder?.rider_id === rider.id;
                    const initials = rider.full_name
                      .split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase();
                    return (
                      <button
                        key={rider.id}
                        onClick={() =>
                          riderDialogOrderId && assignRider(riderDialogOrderId, rider.id)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          isAssigned
                            ? "bg-success/10 border border-success/30"
                            : "hover:bg-(--color-muted) border border-transparent"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isAssigned
                              ? "bg-success text-(--color-success-foreground)"
                              : "bg-(--color-muted) text-(--color-foreground)"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm ${isAssigned ? "text-success" : "text-(--color-foreground)"}`}
                          >
                            {rider.full_name}
                          </p>
                          {rider.phone && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-(--color-muted-foreground)" />
                              <span className="text-xs text-(--color-muted-foreground)">
                                {rider.phone}
                              </span>
                            </div>
                          )}
                        </div>
                        {isAssigned && <Check className="h-4 w-4 shrink-0 text-success" />}
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}
    </div>
  );
}
