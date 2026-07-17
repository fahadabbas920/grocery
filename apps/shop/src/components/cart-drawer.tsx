"use client";

import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { EmptyState, QuantityStepper, FormDrawer } from "@grocery/ui";
import { useCart } from "@/lib/cart/cart-context";
import { ScrollArea } from "@grocery/ui/components/scroll-area";
import { Separator } from "@grocery/ui/components/separator";

export function CartDrawer() {
  const { lines, isOpen, setIsOpen, setQuantity, total, count } = useCart();

  return (
    <FormDrawer
      open={isOpen}
      onOpenChange={setIsOpen}
      title={
        <span className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-5 w-5" />
          Cart
          {count > 0 && (
            <span className="ml-1 rounded-full bg-(--color-primary) px-2 py-0.5 text-xs font-bold text-(--color-primary-foreground)">
              {count}
            </span>
          )}
        </span>
      }
      headerClassName="border-b border-(--color-border) px-4 py-4"
      bodyClassName="flex-1 overflow-hidden p-0"
      footer={
        lines.length > 0 && (
          <div className="w-full space-y-3">
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
        )
      }
      footerClassName="border-t border-(--color-border) p-4"
    >
      <ScrollArea className="h-full px-4 py-4">
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
                <QuantityStepper
                  size="sm"
                  quantity={line.quantity}
                  onDecrement={() => setQuantity(line.product_id, line.quantity - 1)}
                  onIncrement={() => setQuantity(line.product_id, line.quantity + 1)}
                />
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </FormDrawer>
  );
}
