"use client";

import { useEffect, useState } from "react";
import { Button, OrderStatusBadge, EmptyState } from "@grocery/ui";
import { ORDER_STATUS_TRANSITIONS, REALTIME, ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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

const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: "#f59e0b",
  preparing: "#3b82f6",
  on_the_way: "#8b5cf6",
  delivered: "#16a34a",
  cancelled: "#ef4444",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function OrdersBoard({ initialOrders, riders }: { initialOrders: OrderRow[]; riders: Rider[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders);
  const [tab, setTab] = useState<TabFilter>("all");
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
    return () => { void supabase.removeChannel(channel); };
  }, [supabase]);

  async function assignRider(orderId: string, riderId: string) {
    const { error } = await supabase.from("orders").update({ rider_id: riderId }).eq("id", orderId);
    if (error) toast.error("Failed to assign rider");
    else toast.success("Rider assigned");
  }

  async function advanceStatus(orderId: string, next: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status: next }).eq("id", orderId);
    if (error) toast.error("Update failed");
    else toast.success(`Order → ${ORDER_STATUS_LABELS[next]}`);
  }

  const filtered = orders.filter((o) => {
    if (tab === "active") return ["placed", "preparing", "on_the_way"].includes(o.status);
    if (tab === "delivered") return o.status === "delivered";
    if (tab === "cancelled") return o.status === "cancelled";
    return true;
  });

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
          <TabsTrigger value="active">
            Active ({orders.filter((o) => ["placed","preparing","on_the_way"].includes(o.status)).length})
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered ({orders.filter((o) => o.status === "delivered").length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({orders.filter((o) => o.status === "cancelled").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="h-[calc(100vh-260px)]">
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
              const accentColor = STATUS_COLOR[order.status];
              return (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-card) p-4 shadow-sm"
                  style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-xs text-(--color-muted-foreground)">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <OrderStatusBadge status={order.status} />
                      <span className="text-xs text-(--color-muted-foreground)">{timeAgo(order.created_at)}</span>
                    </div>
                    <p className="truncate text-sm text-(--color-foreground)">{order.address}</p>
                    <p className="mt-0.5 text-sm font-semibold">PKR {order.total.toLocaleString()}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={order.rider_id ?? ""}
                      onValueChange={(v) => assignRider(order.id, v)}
                    >
                      <SelectTrigger className={cn("h-8 w-40 text-sm", !order.rider_id && "text-(--color-muted-foreground)")}>
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

                    {nextStatuses.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={status === "cancelled" ? "destructive" : "default"}
                        onClick={() => advanceStatus(order.id, status)}
                      >
                        {ORDER_STATUS_LABELS[status]}
                      </Button>
                    ))}
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
