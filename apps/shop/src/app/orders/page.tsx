import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatusBadge, EmptyState, PageHeader } from "@grocery/ui";
import { getMyOrders } from "@grocery/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";
import { ClipboardList, MapPin } from "lucide-react";

export default async function OrdersPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/orders");

  const orders = await getMyOrders(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Your orders" description="Track and review all your past orders." />

      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No orders yet"
          description="Your order history will appear here once you place your first order."
          action={
            <Link
              href="/"
              className="mt-2 inline-flex h-9 items-center rounded-lg bg-(--color-primary) px-4 text-sm font-semibold text-white"
            >
              Browse catalog
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className="flex items-center justify-between rounded-xl border border-(--color-border) bg-(--color-background) p-4 transition-shadow hover:shadow-md">
                <div className="space-y-1">
                  <p className="font-mono text-xs text-(--color-muted-foreground)">
                    #{order.id.slice(0, 8)}
                  </p>
                  <p className="font-semibold text-(--color-foreground)">
                    PKR {Number(order.total).toLocaleString()}
                  </p>
                  {order.address && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-(--color-muted-foreground)" />
                      <p className="max-w-xs truncate text-xs text-(--color-muted-foreground)">
                        {order.address}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <OrderStatusBadge status={order.status} />
                  <p className="text-xs text-(--color-muted-foreground)">
                    {new Date(order.created_at).toLocaleDateString("en-PK", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
