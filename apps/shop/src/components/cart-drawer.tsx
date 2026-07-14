"use client";

import Link from "next/link";
import { Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { EmptyState } from "@grocery/ui";
import { useCart } from "@/lib/cart/cart-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@grocery/ui/components/sheet";
import { ScrollArea } from "@grocery/ui/components/scroll-area";
import { Separator } from "@grocery/ui/components/separator";

export function CartDrawer() {
  const { lines, isOpen, setIsOpen, setQuantity, remove, total, count } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="right" className="flex w-full max-w-96 flex-col p-0">
        <SheetHeader className="border-b border-(--color-border) px-4 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5" />
            Cart
            {count > 0 && (
              <span className="ml-1 rounded-full bg-(--color-primary) px-2 py-0.5 text-xs font-bold text-(--color-primary-foreground)">
                {count}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          {lines.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="h-6 w-6" />}
              title="Your cart is empty"
              description="Add items from the catalog to get started."
            />
          ) : (
            <div className="space-y-3">
              {lines.map((line) => (
                <div key={line.product_id} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--color-muted)">
                    <Package className="h-5 w-5 text-(--color-muted-foreground)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-(--color-foreground)">
                      {line.name}
                    </p>
                    <p className="text-xs text-(--color-muted-foreground)">
                      PKR {line.price.toLocaleString()} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setQuantity(line.product_id, line.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-(--color-border) text-(--color-foreground) transition-colors hover:bg-(--color-muted)"
                    >
                      {line.quantity === 1 ? (
                        <Trash2 className="h-3.5 w-3.5 text-(--color-destructive)" />
                      ) : (
                        <Minus className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                    <button
                      onClick={() => setQuantity(line.product_id, line.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--color-primary) text-(--color-primary-foreground) transition-colors hover:opacity-90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {lines.length > 0 && (
          <div className="border-t border-(--color-border) p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-(--color-muted-foreground)">Subtotal ({count} items)</span>
              <span className="font-bold text-(--color-foreground)">
                PKR {total.toLocaleString()}
              </span>
            </div>
            <Separator />
            <Link
              href="/cart"
              onClick={() => setIsOpen(false)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-(--color-primary) text-sm font-semibold text-(--color-primary-foreground) transition-colors hover:opacity-90"
            >
              Proceed to checkout →
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
