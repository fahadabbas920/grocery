import { getMapsConfig } from "@grocery/db/queries";
import { getServerSupabase } from "@/lib/supabase/server";
import { CartView } from "@/components/cart-view";

export default async function CartPage() {
  const supabase = await getServerSupabase();
  const mapsConfig = await getMapsConfig(supabase);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Your cart</h1>
      <CartView mapsConfig={mapsConfig} />
    </div>
  );
}
