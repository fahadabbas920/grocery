import { Bike, ChefHat, Clock, PackageCheck, XCircle, type LucideIcon } from "lucide-react";
import type { OrderStatus } from "@grocery/shared";

export interface OrderStatusStyle {
  /** Hex accent used for inline-style icon backgrounds / charts. */
  hex: string;
  /** Tailwind card background tint (ops order cards). */
  cardBg: string;
  /** Tailwind classes for a bordered pill badge. */
  badge: string;
  /** Tailwind class for the live-pulse dot. */
  dot: string;
  /** Tailwind classes for a square icon container. */
  iconBg: string;
  /** Tailwind gradient for full-bleed hero banners. */
  gradient: string;
  /** Lucide icon for this status. */
  icon: LucideIcon;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusStyle> = {
  placed: {
    hex: "#f59e0b",
    cardBg: "bg-amber-50",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    iconBg: "bg-amber-100 text-amber-600",
    gradient: "from-amber-500 to-orange-400",
    icon: Clock,
  },
  preparing: {
    hex: "#3b82f6",
    cardBg: "bg-blue-50",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    iconBg: "bg-blue-100 text-blue-600",
    gradient: "from-blue-600 to-blue-400",
    icon: ChefHat,
  },
  on_the_way: {
    hex: "#8b5cf6",
    cardBg: "bg-purple-50",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    iconBg: "bg-purple-100 text-purple-600",
    gradient: "from-purple-600 to-purple-400",
    icon: Bike,
  },
  delivered: {
    hex: "#16a34a",
    cardBg: "bg-green-50",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
    iconBg: "bg-green-100 text-green-600",
    gradient: "from-green-700 to-green-500",
    icon: PackageCheck,
  },
  cancelled: {
    hex: "#ef4444",
    cardBg: "bg-red-50",
    badge: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
    iconBg: "bg-red-100 text-red-500",
    gradient: "from-red-600 to-red-400",
    icon: XCircle,
  },
};
