import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-center", className)}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-(--color-muted) text-(--color-muted-foreground)">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-(--color-foreground)">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-(--color-muted-foreground)">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
