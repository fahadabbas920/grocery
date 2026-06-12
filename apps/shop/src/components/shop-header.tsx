"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, ClipboardList, LogIn, LogOut, User } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { useSearch } from "@/lib/search-context";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function ShopHeader() {
  const { count, setIsOpen } = useCart();
  const { query, setQuery } = useSearch();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initials = user?.user_metadata?.full_name
    ? (user.user_metadata.full_name as string).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-20 border-b border-(--color-border) bg-(--color-background)">
      {/* Top row */}
      <div className="flex h-14 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-primary) text-sm font-black text-white">
            G
          </div>
          <span className="text-base font-bold text-(--color-foreground) hidden sm:block">
            Grocery
          </span>
        </Link>

        <div className="hidden sm:flex items-center gap-1 text-(--color-muted-foreground)">
          <span className="text-xs font-medium">📍 Delivering now</span>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/orders"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
            title="My orders"
          >
            <ClipboardList className="h-5 w-5" />
          </Link>

          {user ? (
            <div className="flex items-center gap-1">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-(--color-primary) select-none"
                title={user.email}
              >
                {initials}
              </div>
              <button
                onClick={signOut}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-(--color-muted-foreground) transition-colors hover:bg-(--color-muted) hover:text-(--color-foreground)"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
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

      {/* Search row */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-muted-foreground)" />
          <input
            type="search"
            placeholder="Search for groceries, milk, eggs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-(--color-border) bg-(--color-muted) pl-9 pr-4 text-sm placeholder:text-(--color-muted-foreground) focus:border-(--color-ring) focus:bg-(--color-background) focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
          />
        </div>
      </div>
    </header>
  );
}
