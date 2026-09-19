"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Package, Store, Bike, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@grocery/shared";

const ICONS: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  Orders: ShoppingBag,
  Catalog: Package,
  Store: Store,
  Vendors: Store,
  Dispatch: Bike,
  Accounts: Users,
  Settings,
};

export interface NavLink {
  href: string;
  label: string;
  roles: UserRole[];
}

interface NavListProps {
  links: NavLink[];
  onNavigate?: () => void;
  className?: string;
}

/** Shared nav-link list rendered by both the desktop Sidebar and the mobile drawer. */
export function NavList({ links, onNavigate, className }: NavListProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-col gap-0.5", className)}>
      {links.map((item) => {
        const Icon = ICONS[item.label] ?? LayoutDashboard;
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-(--color-sidebar-item-active) text-(--color-sidebar-item-active-text) font-medium"
                : "text-(--color-foreground) hover:bg-(--color-sidebar-item-hover)",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
