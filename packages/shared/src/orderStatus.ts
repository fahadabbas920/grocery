/**
 * Order status state machine — the single source of truth for the order lifecycle.
 *
 * Mirrored by the Postgres `order_status` enum and the status-transition guard
 * trigger (see supabase/migrations). Keep all three in sync.
 */

export const ORDER_STATUSES = ["placed", "preparing", "on_the_way", "delivered", "cancelled"] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Human-friendly labels for UI. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  placed: "Placed",
  preparing: "Preparing",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/**
 * Allowed forward transitions. An order may also be cancelled from any
 * non-terminal state. Terminal states (delivered, cancelled) allow no transitions.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  placed: ["preparing", "cancelled"],
  preparing: ["on_the_way", "cancelled"],
  on_the_way: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

/** The happy-path ordering used to render progress indicators. */
export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  "placed",
  "preparing",
  "on_the_way",
  "delivered",
];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[status].length === 0;
}
