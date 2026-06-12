import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { Badge } from "./badge";

const VARIANT_BY_STATUS: Record<OrderStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  placed: "secondary",
  preparing: "default",
  on_the_way: "default",
  delivered: "outline",
  cancelled: "destructive",
};

/** Renders an order's status with a consistent color across all surfaces. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}
