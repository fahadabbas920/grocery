import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface Trend {
  value: number;
  label: string;
}

interface StatsCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: Trend;
  sub?: string;
  valueClassName?: string;
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  trend,
  sub,
  valueClassName,
  className,
}: StatsCardProps) {
  const trendPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-(--color-border) bg-(--color-card) p-5 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-(--color-muted-foreground)">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-sidebar-item-active) text-(--color-primary)">
            {icon}
          </div>
        )}
      </div>
      <p className={cn("text-2xl font-bold text-(--color-foreground)", valueClassName)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-(--color-muted-foreground)">{sub}</p>}
      {trend && (
        <p
          className={`mt-1 text-xs font-medium ${trendPositive ? "text-(--color-success)" : "text-(--color-destructive)"}`}
        >
          {trendPositive ? "+" : ""}
          {trend.value} {trend.label}
        </p>
      )}
    </div>
  );
}
