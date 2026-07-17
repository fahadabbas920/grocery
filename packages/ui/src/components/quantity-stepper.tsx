"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";

export interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** Control size — "sm" for the compact drawer, "md" for the cart page. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Quantity control with a trash icon when decrementing from 1. Shared by the cart
 * page and the cart drawer. Buttons carry accessible labels.
 */
export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  size = "md",
  className,
}: QuantityStepperProps) {
  const btn = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <button
        type="button"
        onClick={onDecrement}
        aria-label={quantity === 1 ? "Remove item" : "Decrease quantity"}
        className={cn(
          "flex items-center justify-center rounded-lg border border-(--color-border) text-(--color-foreground) transition-colors hover:bg-(--color-muted)",
          btn,
        )}
      >
        {quantity === 1 ? (
          <Trash2 className={cn(icon, "text-destructive")} />
        ) : (
          <Minus className={icon} />
        )}
      </button>
      <span className="w-6 text-center font-semibold" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className={cn(
          "flex items-center justify-center rounded-lg bg-(--color-primary) text-(--color-primary-foreground) transition-colors hover:opacity-90",
          btn,
        )}
      >
        <Plus className={icon} />
      </button>
    </div>
  );
}
