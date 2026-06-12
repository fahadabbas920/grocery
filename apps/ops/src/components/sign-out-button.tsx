"use client";
import { useRouter } from "next/navigation";
import { Button } from "@grocery/ui";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  }
  return (
    <Button variant="outline" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
