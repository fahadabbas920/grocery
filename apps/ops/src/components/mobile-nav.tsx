"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import { Logo, Sheet, SheetContent, SheetHeader, SheetTitle } from "@grocery/ui";
import { NavList, type NavLink } from "@/components/nav-list";
import { signOut } from "@/lib/sign-out";
import type { UserRole } from "@grocery/shared";

interface MobileNavProps {
  links: NavLink[];
  profile: { full_name: string | null; role: UserRole };
}

export function MobileNav({ links, profile }: MobileNavProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-(--color-sidebar-border) bg-(--color-sidebar-bg) px-4 md:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-(--color-foreground) hover:bg-(--color-sidebar-item-hover)"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Logo variant="mark" className="h-7 w-7 shrink-0" />
      <span className="truncate text-sm font-semibold text-(--color-foreground)">
        {profile.full_name ?? "Ops User"}
      </span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="border-b border-(--color-sidebar-border) px-4 py-4 text-left">
            <SheetTitle>{profile.full_name ?? "Ops User"}</SheetTitle>
            <p className="text-xs capitalize text-(--color-muted-foreground)">
              {profile.role.replace("_", " ")}
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-auto p-2">
            <NavList links={links} onNavigate={() => setOpen(false)} />
          </div>

          <div className="border-t border-(--color-sidebar-border) p-2">
            <button
              onClick={() => signOut(router)}
              className="flex w-full items-center gap-2.5 rounded-lg border border-(--color-sidebar-border) px-3 py-2 text-sm font-medium text-(--color-muted-foreground) transition-colors hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
