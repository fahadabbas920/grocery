import { ORDER_STATUS_LABELS, type OrderStatus } from "@grocery/shared";
import { Badge } from "./badge";
import { ORDER_STATUS_CONFIG } from "../order-status-config";

/**
 * Renders an order's status as a colored pill. Colors come from the SINGLE source
 * of truth — `ORDER_STATUS_CONFIG` — so the badge matches the status cards, hero
 * banners, and steppers that consume the same config everywhere.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={ORDER_STATUS_CONFIG[status].badge}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
