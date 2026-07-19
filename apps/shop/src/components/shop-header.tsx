"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, ClipboardList, LogIn, LogOut, ChevronDown } from "lucide-react";
import { Logo } from "@grocery/ui";
import { displayIdentifier } from "@grocery/shared";
import { useCart } from "@/lib/cart/cart-context";
import { useSearch } from "@/lib/search-context";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useUser } from "@/lib/use-user";

export function ShopHeader() {
  const { count, setIsOpen } = useCart();
  useSearch(); // keep provider mounted; search input lives in CatalogBrowser
  const router = useRouter();
  const user = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function signOut() {
    setMenuOpen(false);
    await getBrowserSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const identifier = user?.email ? displayIdentifier(user.email) : "";
  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string)
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (identifier[0]?.toUpperCase() ?? "?");

  return (
    <header className="sticky top-0 z-20 border-b border-(--color-border) bg-(--color-background)">
      {/* Top row */}
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center shrink-0">
          <Logo variant="mark" className="h-8 w-8 sm:hidden" />
          <Logo variant="horizontal" className="hidden h-8 sm:block" />
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-(--color-muted)"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-(--color-primary) select-none">
                  {initials}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-(--color-muted-foreground) transition-transform ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-(--color-border) bg-(--color-card) py-1 shadow-lg">
                  <p className="truncate px-3 py-2 text-xs text-(--color-muted-foreground)">
                    {identifier}
                  </p>
                  <div className="border-t border-(--color-border)" />
                  <Link
                    href="/orders"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-(--color-foreground) transition-colors hover:bg-(--color-muted)"
                  >
                    <ClipboardList className="h-4 w-4" />
                    My orders
                  </Link>
                  <button
                    onClick={signOut}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center gap-1.5 rounded-lg bg-(--color-secondary) px-3 text-sm font-medium text-(--color-secondary-foreground) transition-colors hover:opacity-90"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
          )}

          <button
            onClick={() => setIsOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
            title="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-primary) text-[10px] font-bold text-white">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
