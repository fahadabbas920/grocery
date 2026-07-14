import type { OrderStatus } from "@grocery/shared";

/**
 * Rider design tokens. Every color / spacing / radius / font size used across the
 * app should reference this module instead of hardcoding hex values or magic numbers.
 */

export const colors = {
  // Brand green
  brand: "#16a34a",
  brandLight: "#4ade80",
  brandPale: "#d1fae5",
  brandBg: "#f0fdf4",
  brandBgDeep: "#dcfce7",
  brandText: "#166534",
  brandTextDeep: "#14532d",

  // Accents
  purple: "#8b5cf6",
  blue: "#1d4ed8",

  // Feedback
  danger: "#ef4444",
  dangerBorder: "#fecaca",

  // Neutrals
  white: "#fff",
  bg: "#f8fafc",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  inputBg: "#f9fafb",

  // Text
  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  textDisabled: "#d1d5db",
} as const;

/** Status → accent color. Single source of truth for the whole app. */
export const statusColors: Record<OrderStatus, string> = {
  placed: "#f59e0b",
  preparing: "#3b82f6",
  on_the_way: "#8b5cf6",
  delivered: "#16a34a",
  cancelled: "#ef4444",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 15,
  xl: 16,
  xxl: 18,
  title: 20,
  hero: 26,
} as const;

export type ShadowPreset = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export const shadow: Record<"sm" | "md" | "lg" | "brand", ShadowPreset> = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  brand: {
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};
