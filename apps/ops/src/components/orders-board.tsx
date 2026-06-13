"use client";

import { useEffect, useState } from "react";
import { Button, OrderStatusBadge, EmptyState, ORDER_STATUS_CONFIG } from "@grocery/ui";
import {
  ORDER_STATUS_TRANSITIONS,
  REALTIME,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@grocery/shared";
import { toast } from "sonner";
import { Clock, MapPin, ShoppingBag, User, Zap } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderRow {
  id: string;
  status: OrderStatus;
  total: number;
  address: string;
  rider_id: string | null;
  created_at: string;
}

interface Rider {
  id: string;
  full_name: string;
  phone: string | null;
}

type TabFilter = "all" | "active" | "delivered" | "cancelled";


function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="flex flex-1 flex-col gap-1 rounded-2xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm">
      <span className="text-xs font-medium text-(--color-muted-foreground)">{label}</span>
      <span className="text-2xl font-bold text-(--color-foreground)" style={{ color }}>{value}</span>
      {sub && <span className="text-xs text-(--color-muted-foreground)">{sub}</span>}
    </div>
  );
}

export function OrdersBoard({
  initialOrders,
  riders,
}: {
  initialOrders: OrderRow[];
  riders: Rider[];
}) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState<TabFilter>("all");
  const [mutating, setMutating] = useState<string | null>(null);
  const supabase = getBrowserSupabase();

  useEffect(() => {
    const channel = supabase
      .channel(REALTIME.ordersChannel)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => {
          const row = payload.new as OrderRow;
          if (payload.eventType === "INSERT") return [row, ...prev];
          return prev.map((o) => (o.id === row.id ? { ...o, ...row } : o));
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function assignRider(orderId: string, riderId: string) {
    const key = `rider:${orderId}`;
    if (mutating === key) return;
    setMutating(key);
    const { error } = await supabase.from("orders").update({ rider_id: riderId }).eq("id", orderId);
    if (error) toast.error("Failed to assign rider");
    else toast.success("Rider assigned");
    setMutating(null);
  }

  async function advanceStatus(orderId: string, next: OrderStatus) {
    const key = `status:${orderId}:${next}`;
    if (mutating === key) return;
    setMutating(key);
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
    if (error) toast.error("Update failed");
    else toast.success(`Order → ${ORDER_STATUS_LABELS[next]}`);
    setMutating(null);
  }

  const activeOrders = orders.filter((o) => ["placed", "preparing", "on_the_way"].includes(o.status));
  const revenue = orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0);

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
        <StatCard label="Total Orders" value={orders.length} color="#111" />
        <StatCard label="Active" value={activeOrders.length} sub="in progress" color="#f59e0b" />
        <StatCard
          label="Revenue"
          value={`PKR ${revenue.toLocaleString()}`}
          sub="delivered only"
          color="#16a34a"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
        <TabsList className="h-10 rounded-xl p-1">
          <TabsTrigger value="all" className="rounded-lg px-4 text-sm">
            All <span className="ml-1.5 rounded-full bg-(--color-muted) px-1.5 py-0.5 text-xs font-semibold">{orders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-lg px-4 text-sm">
            Active <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">{activeOrders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="delivered" className="rounded-lg px-4 text-sm">
            Delivered <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">{orders.filter((o) => o.status === "delivered").length}</span>
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg px-4 text-sm">
            Cancelled <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-600">{orders.filter((o) => o.status === "cancelled").length}</span>
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
                  {/* Left accent bar */}
                  <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ backgroundColor: statusCfg.hex }} />

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
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-(--color-muted-foreground)">
                            <Clock className="h-3 w-3" />
                            {timeAgo(order.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-bold text-(--color-foreground)">
                          PKR {order.total.toLocaleString()}
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
                    <div className="mt-3 flex items-start gap-1.5 px-4">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--color-muted-foreground)" />
                      <p className="text-sm text-(--color-foreground) line-clamp-1">{order.address}</p>
                    </div>

                    {/* Actions row */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 bg-card/60 px-4 py-3">
                      <Select
                        value={order.rider_id ?? ""}
                        onValueChange={(v) => assignRider(order.id, v)}
                        disabled={
                          order.status === "cancelled" ||
                          order.status === "delivered" ||
                          mutating === `rider:${order.id}`
                        }
                      >
                        <SelectTrigger className="h-8 w-44 rounded-lg border-(--color-border) bg-(--color-background) text-sm">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-(--color-muted-foreground)" />
                            <SelectValue placeholder="Assign rider…" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {riders.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-1.5 ml-auto">
                        {nextStatuses.map((status) => {
                          const key = `status:${order.id}:${status}`;
                          return (
                            <Button
                              key={status}
                              size="sm"
                              variant={status === "cancelled" ? "destructive" : "default"}
                              className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                              disabled={mutating === key}
                              onClick={() => advanceStatus(order.id, status)}
                            >
                              {status !== "cancelled" && <Zap className="h-3 w-3" />}
                              {mutating === key ? "Saving…" : ORDER_STATUS_LABELS[status]}
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
    </div>
  );
}
