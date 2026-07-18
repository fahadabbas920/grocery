"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Store,
  Bike,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@grocery/ui";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { signOut } from "@/lib/sign-out";
import type { NavLink } from "@/components/nav-list";
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

interface SidebarProps {
  links: NavLink[];
  profile: { full_name: string | null; role: UserRole };
}

/** Persistent desktop nav. Hidden below `md`; MobileNav covers small screens. */
export function Sidebar({ links, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("ops.sidebar.collapsed");
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("ops.sidebar.collapsed", String(next));
  }

  const initials = profile.full_name
    ? profile.full_name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profile.role.slice(0, 2).toUpperCase();

  if (!mounted) {
    return (
      <aside className="hidden w-56 shrink-0 border-r border-(--color-sidebar-border) bg-(--color-sidebar-bg) md:flex" />
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative hidden shrink-0 border-r border-(--color-sidebar-border) bg-(--color-sidebar-bg) md:flex md:flex-col",
          "transition-[width] duration-200 ease-in-out",
          collapsed ? "w-16" : "w-56",
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Brand */}
          <div className={cn("flex items-center px-4 py-4", collapsed && "justify-center px-0")}>
            <Logo
              variant={collapsed ? "mark" : "horizontal"}
              className={collapsed ? "h-8 w-8" : "h-8"}
            />
          </div>

          <div className="mx-3 border-t border-(--color-sidebar-border)" />

          {/* User */}
          <div className={cn("flex items-center gap-3 px-3 py-4", collapsed && "justify-center")}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-primary) text-sm font-bold text-(--color-primary-foreground)">
              {initials}
            </div>
            <div
              className={cn(
                "min-w-0 transition-all duration-200",
                collapsed && "w-0 overflow-hidden opacity-0",
              )}
            >
              <p className="truncate text-sm font-semibold text-(--color-foreground)">
                {profile.full_name ?? "Ops User"}
              </p>
              <p className="truncate text-xs capitalize text-(--color-muted-foreground)">
                {profile.role.replace("_", " ")}
              </p>
            </div>
          </div>

          <div className="mx-3 border-t border-(--color-sidebar-border)" />

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-0.5 p-2 pt-3">
            {links.map((item) => {
              const Icon = ICONS[item.label] ?? LayoutDashboard;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              const linkEl = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    collapsed && "justify-center",
                    isActive
                      ? "bg-(--color-sidebar-item-active) text-(--color-sidebar-item-active-text) font-medium"
                      : "text-(--color-foreground) hover:bg-(--color-sidebar-item-hover)",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={cn(
                      "transition-all duration-200",
                      collapsed && "w-0 overflow-hidden opacity-0",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return linkEl;
            })}
          </nav>

          {/* Footer: sign out */}
          <div className="border-t border-(--color-sidebar-border) p-2">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => signOut(router)}
                    className="flex w-full items-center justify-center rounded-lg border border-transparent p-2.5 text-(--color-muted-foreground) transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={() => signOut(router)}
                className="group flex w-full items-center gap-2.5 rounded-lg border border-(--color-sidebar-border) bg-sidebar-item-hover/40 px-3 py-2 text-sm font-medium text-(--color-muted-foreground) transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle: floating handle on the sidebar edge */}
        <button
          onClick={toggle}
          className="absolute top-6 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-(--color-sidebar-border) bg-(--color-sidebar-bg) text-(--color-foreground) shadow-md transition-all hover:scale-110 hover:border-primary/40 hover:text-(--color-primary)"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
