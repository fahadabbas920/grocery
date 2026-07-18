import type { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

export async function signOut(router: ReturnType<typeof useRouter>) {
  await getBrowserSupabase().auth.signOut();
  router.push("/login");
}
