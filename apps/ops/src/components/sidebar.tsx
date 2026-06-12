"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@grocery/db/browser";
import type { UserRole } from "@grocery/shared";

const ICONS: Record<string, React.ElementType> = {
  Dashboard: LayoutDashboard,
  Orders: ShoppingBag,
  Catalog: Package,
  Inventory: Boxes,
  Accounts: Users,
  Settings,
};

interface NavLink {
  href: string;
  label: string;
  roles: UserRole[];
}

interface SidebarProps {
  links: NavLink[];
  profile: { full_name: string | null; role: UserRole };
}

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

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = profile.full_name
    ? profile.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : profile.role.slice(0, 2).toUpperCase();

  if (!mounted) {
    return <aside className="flex w-56 shrink-0 border-r border-(--color-sidebar-border) bg-(--color-sidebar-bg)" />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex flex-col border-r border-(--color-sidebar-border) bg-(--color-sidebar-bg) shrink-0",
          "transition-[width] duration-200 ease-in-out overflow-hidden",
          collapsed ? "w-16" : "w-56",
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center gap-3 px-3 py-4", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-(--color-primary) text-sm font-bold text-white">
            {initials}
          </div>
          <div className={cn("min-w-0 transition-all duration-200", collapsed && "w-0 overflow-hidden opacity-0")}>
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
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

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
                <span className={cn("transition-all duration-200", collapsed && "w-0 overflow-hidden opacity-0")}>
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

        <div className="mx-3 border-t border-(--color-sidebar-border)" />

        {/* Sign out + collapse toggle */}
        <div className="p-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-(--color-muted-foreground) transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-(--color-muted-foreground) transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </button>
          )}
          <button
            onClick={toggle}
            className="mt-1 flex w-full items-center justify-center rounded-lg p-2 text-(--color-muted-foreground) transition-colors hover:bg-(--color-sidebar-item-hover)"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
