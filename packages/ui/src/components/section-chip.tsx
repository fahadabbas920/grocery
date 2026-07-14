"use client";

import { cn } from "../lib/utils";

interface SectionChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SectionChip({ label, active, onClick, className }: SectionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-(--color-primary) text-(--color-primary-foreground)"
          : "bg-(--color-muted) text-(--color-foreground) hover:bg-(--color-sidebar-item-active) hover:text-(--color-sidebar-item-active-text)",
        className,
      )}
    >
      {label}
    </button>
  );
}
