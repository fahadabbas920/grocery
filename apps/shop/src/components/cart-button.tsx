"use client";
import Link from "next/link";
import { useCart } from "@/lib/cart/cart-context";

export function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative">
      Cart
      {count > 0 && (
        <span className="ml-1 rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-xs text-[var(--color-primary-foreground)]">
          {count}
        </span>
      )}
    </Link>
  );
}
