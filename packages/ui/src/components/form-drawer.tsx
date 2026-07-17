"use client";

import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./sheet";

interface FormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

/** Shared side-drawer shell (header + scrollable body + footer) used across ops and shop. */
export function FormDrawer({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  side = "right",
  contentClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: FormDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn("flex w-full flex-col gap-0 p-0", contentClassName)}>
        <SheetHeader className={cn("border-b border-(--color-border) px-6 py-5", headerClassName)}>
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <SheetFooter
            className={cn("border-t border-(--color-border) px-6 py-4", footerClassName)}
          >
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
