"use server";

import { revalidatePath } from "next/cache";
import { storeInputSchema, type StoreInput, type StoreStatus } from "@grocery/shared";
import { createStore, updateStore, setStoreStatus } from "@grocery/db/queries";
import { createAdminClient } from "@grocery/db/admin";
import { requireOpsProfile, isAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export interface VendorActionResult {
  ok: boolean;
  error?: string;
  storeId?: string;
  /** Temp password for a freshly-created owner (shown once to the admin). */
  tempPassword?: string;
}

async function assertAdmin() {
  const profile = await requireOpsProfile();
  if (!isAdmin(profile.role)) throw new Error("Forbidden");
}

function tempPassword() {
  return `Gv-${crypto.randomUUID().slice(0, 8)}!`;
}

/**
 * Create a store and (optionally) its owner account. Store CRUD runs under the admin's
 * RLS; owner creation uses the service-role client (auth admin). New stores start in
 * `onboarding` and go live only when an admin activates them.
 */
export async function createVendorAction(input: {
  store: StoreInput;
  ownerEmail?: string;
  ownerName?: string;
}): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = storeInputSchema.safeParse(input.store);
  if (!parsed.success) return { ok: false, error: "Invalid store details" };

  const supabase = await getServerSupabase();
  let storeId: string;
  try {
    storeId = await createStore(supabase, parsed.data);
    await setStoreStatus(supabase, storeId, "onboarding");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create store" };
  }

  let password: string | undefined;
  const email = input.ownerEmail?.trim();
  if (email) {
    const admin = createAdminClient();
    password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: input.ownerName ?? "" },
    });
    if (error || !data.user) {
      return { ok: false, error: `Store created, but owner invite failed: ${error?.message}` };
    }
    // Profile is auto-created (role 'customer') by the signup trigger; elevate + link.
    await admin
      .from("profiles")
      .update({ role: "stock_keeper", full_name: input.ownerName ?? "" })
      .eq("id", data.user.id);
    const { error: memberErr } = await admin
      .from("store_members")
      .insert({ store_id: storeId, user_id: data.user.id, store_role: "owner" });
    if (memberErr)
      return { ok: false, error: `Owner created, but link failed: ${memberErr.message}` };
  }

  revalidatePath("/vendors");
  return { ok: true, storeId, tempPassword: password };
}

/** Update a store's profile. */
export async function updateStoreAction(
  storeId: string,
  store: StoreInput,
): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  const parsed = storeInputSchema.safeParse(store);
  if (!parsed.success) return { ok: false, error: "Invalid store details" };
  try {
    await updateStore(await getServerSupabase(), storeId, parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update store" };
  }
  revalidatePath("/vendors");
  return { ok: true, storeId };
}

/** Approve/suspend/reactivate a store (admin lifecycle control). */
export async function setStoreStatusAction(
  storeId: string,
  status: StoreStatus,
): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }
  try {
    await setStoreStatus(await getServerSupabase(), storeId, status);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update status" };
  }
  revalidatePath("/vendors");
  return { ok: true, storeId };
}
