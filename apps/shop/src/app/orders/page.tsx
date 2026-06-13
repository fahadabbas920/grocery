import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, ORDER_STATUS_CONFIG } from "@grocery/ui";
import { getMyOrders } from "@grocery/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { ClipboardList, MapPin, ChevronRight, ShoppingBag } from "lucide-react";

function formatOrderCode(id: string) {
  const upper = id.replace(/-/g, "").toUpperCase().slice(0, 8);
  return `${upper.slice(0, 4)}-${upper.slice(4)}`;
}

export default async function OrdersPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/orders");

  const orders = await getMyOrders(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-(--color-foreground)">Your Orders</h1>
        <p className="mt-1 text-sm text-(--color-muted-foreground)">
          {orders.length > 0
            ? `${orders.length} order${orders.length !== 1 ? "s" : ""} placed`
            : "Track and review all your past orders."}
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No orders yet"
          description="Your order history will appear here once you place your first order."
          action={
            <Link
              href="/"
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-lg bg-(--color-primary) px-4 text-sm font-semibold text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              Browse catalog
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = ORDER_STATUS_CONFIG[order.status as OrderStatus] ?? ORDER_STATUS_CONFIG.placed;
            const StatusIcon = cfg.icon;
            const isActive = !["delivered", "cancelled"].includes(order.status);
            return (
              <Link key={order.id} href={`/orders/${order.id}`} className="inline-block w-full">
                <div className="group flex items-center gap-4 rounded-2xl border border-(--color-border) bg-(--color-background) p-4 transition-all hover:border-primary/30 hover:shadow-md">
                  {/* Status icon */}
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-(--color-foreground)">
                        {formatOrderCode(order.id)}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-(--color-primary)">
                          <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${cfg.dot}`} />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-base font-bold text-(--color-foreground)">
                      PKR {Number(order.total).toLocaleString()}
                    </p>
                    {order.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-(--color-muted-foreground)" />
                        <p className="truncate text-xs text-(--color-muted-foreground)">
                          {order.address}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: status + date + arrow */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${cfg.badge}`}
                    >
                      {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                    </span>
                    <span className="text-xs text-(--color-muted-foreground)">
                      {new Date(order.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-(--color-muted-foreground) transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
