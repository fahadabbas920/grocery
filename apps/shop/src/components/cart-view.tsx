"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, QuantityStepper } from "@grocery/ui";
import type { MapProvider } from "@grocery/shared";
import { useCart } from "@/lib/cart/cart-context";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { placeOrder } from "@/app/cart/actions";
import { Package, ShoppingBag, MapPin, Banknote } from "lucide-react";
import { LocationPicker, type PickedLocation } from "./location-picker";
import { Separator } from "@grocery/ui/components/separator";
import { toast } from "sonner";

interface CartViewProps {
  mapsConfig: { provider: MapProvider; publicToken: string | null };
}

export function CartView({ mapsConfig }: CartViewProps) {
  const router = useRouter();
  const { lines, setQuantity, total, count, clear } = useCart();
  const [location, setLocation] = useState<PickedLocation>({ lat: 0, lng: 0, address: "" });
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  // Group by shop so each shop's items + its delivery fee show together (one delivery per shop).
  const storeGroups = Array.from(
    lines.reduce((map, l) => {
      const g = map.get(l.store_id) ?? {
        name: l.store_name,
        fee: l.delivery_fee,
        lines: [] as typeof lines,
      };
      g.lines.push(l);
      return map.set(l.store_id, g);
    }, new Map<string, { name: string; fee: number; lines: typeof lines }>()),
  );
  const deliveryTotal = storeGroups.reduce((sum, [, g]) => sum + g.fee, 0);
  const grandTotal = total + deliveryTotal;

  async function checkout() {
    setPlacing(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await getBrowserSupabase().auth.getUser();
      if (!user) {
        router.push("/login?redirect=/cart");
        setPlacing(false);
        return;
      }

      const result = await placeOrder({
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        address: location.address,
        delivery_lat: location.lat,
        delivery_lng: location.lng,
      });

      if (!result.ok) {
        setError(result.error ?? "Could not place order");
        toast.error(result.error ?? "Could not place order");
        setPlacing(false);
        return;
      }
      clear();
      router.push(`/orders/${result.orderId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Something went wrong. Please try again.");
      setPlacing(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12">
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Head back to the catalog to add items."
          action={
            <a
              href="/"
              className="mt-2 inline-flex h-9 items-center rounded-lg bg-(--color-primary) px-4 text-sm font-semibold text-(--color-primary-foreground)"
            >
              Browse catalog
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="lg:grid lg:grid-cols-5 lg:gap-8">
        {/* Left: item list */}
        <div className="lg:col-span-3 space-y-3 border border-(--color-border) bg-(--color-background) p-4 lg:p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-(--color-foreground)">
            Your items ({count})
          </h2>
          {lines.map((line) => (
            <div key={line.product_id} className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-(--color-muted)">
                <Package className="h-5 w-5 text-(--color-muted-foreground)" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-(--color-foreground)">{line.name}</p>
                <p className="text-sm text-(--color-muted-foreground)">
                  PKR {line.price.toLocaleString()}
                </p>
              </div>
              <QuantityStepper
                quantity={line.quantity}
                onDecrement={() => setQuantity(line.product_id, line.quantity - 1)}
                onIncrement={() => setQuantity(line.product_id, line.quantity + 1)}
              />
              <p className="w-24 shrink-0 text-right text-sm font-semibold text-(--color-foreground)">
                PKR {(line.price * line.quantity).toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Right: order summary */}
        <div className="mt-6 lg:col-span-2 lg:mt-0">
          <div className="sticky top-30 rounded-2xl border border-(--color-border) bg-(--color-background) p-5">
            <h2 className="mb-4 text-base font-semibold text-(--color-foreground)">
              Order summary
            </h2>

            <div className="space-y-3 text-sm">
              {storeGroups.map(([storeId, g]) => (
                <div key={storeId} className="space-y-1.5">
                  {storeGroups.length > 1 && (
                    <p className="text-xs font-semibold text-(--color-foreground)">{g.name}</p>
                  )}
                  {g.lines.map((line) => (
                    <div
                      key={line.product_id}
                      className="flex justify-between text-(--color-muted-foreground)"
                    >
                      <span>
                        {line.name} × {line.quantity}
                      </span>
                      <span>PKR {(line.price * line.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-xs text-(--color-muted-foreground)">
                    <span>Delivery{storeGroups.length > 1 ? ` · ${g.name}` : ""}</span>
                    <span>{g.fee > 0 ? `PKR ${g.fee.toLocaleString()}` : "Free"}</span>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            <div className="flex justify-between font-bold text-(--color-foreground)">
              <span>Total</span>
              <span>PKR {grandTotal.toLocaleString()}</span>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-(--color-muted) p-3">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-(--color-muted-foreground)" />
              <p className="text-xs text-(--color-muted-foreground)">
                Cash on delivery — pay when your order arrives.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-(--color-foreground)">
                <MapPin className="h-4 w-4 text-(--color-primary)" />
                Delivery location
              </label>
              <LocationPicker
                address={location.address}
                lat={location.lat}
                lng={location.lng}
                onLocationChange={setLocation}
                mapsConfig={mapsConfig}
              />
            </div>

            {error && <p className="mt-2 text-sm text-(--color-destructive)">{error}</p>}

            <button
              onClick={checkout}
              disabled={placing || location.address.trim().length < 5}
              className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-(--color-primary) text-sm font-semibold text-(--color-primary-foreground) transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {placing ? "Placing order…" : "Place order (COD)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
