import * as React from "react";
import { cn } from "../lib/utils";

/** Loading placeholder. Pulses using the theme's muted token. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export { Skeleton };
