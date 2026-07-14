import { ShoppingBag, CheckCircle2, TrendingUp, BarChart3 } from "lucide-react";
import { PageHeader, StatsCard, OrderStatusBadge } from "@grocery/ui";
import { getOrdersByStatus } from "@grocery/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardHome() {
  const supabase = await getServerSupabase();
  const [active, delivered] = await Promise.all([
    getOrdersByStatus(supabase, ["placed", "preparing", "on_the_way"]),
    getOrdersByStatus(supabase, ["delivered"]),
  ]);

  const revenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrderValue = delivered.length > 0 ? Math.round(revenue / delivered.length) : 0;

  const recent = [...active, ...delivered]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div>
      <PageHeader title="Dashboard" description="Live overview of your delivery operations" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard
          label="Active orders"
          value={active.length}
          icon={<ShoppingBag className="h-4 w-4" />}
        />
        <StatsCard
          label="Delivered today"
          value={delivered.length}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatsCard
          label="Revenue"
          value={`PKR ${revenue.toLocaleString()}`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatsCard
          label="Avg. order value"
          value={`PKR ${avgOrderValue.toLocaleString()}`}
          icon={<BarChart3 className="h-4 w-4" />}
        />
      </div>

      {recent.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-(--color-muted-foreground) uppercase tracking-wide">
            Recent orders
          </h2>
          <div className="rounded-xl border border-(--color-border) overflow-hidden bg-(--color-card)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs text-(--color-muted-foreground)">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{order.address}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      PKR {Number(order.total).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
