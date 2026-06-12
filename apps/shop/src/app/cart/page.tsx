import { CartView } from "@/components/cart-view";

export default function CartPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Your cart</h1>
      <CartView />
    </div>
  );
}
