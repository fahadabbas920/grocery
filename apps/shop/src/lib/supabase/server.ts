import "server-only";
import { cookies } from "next/headers";
import { createServerSupabase } from "@grocery/db/server";

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerSupabase({
    getAll: () => cookieStore.getAll(),
    setAll: (toSet) => {
      for (const { name, value, options } of toSet) {
        cookieStore.set(name, value, options);
      }
    },
  });
}
