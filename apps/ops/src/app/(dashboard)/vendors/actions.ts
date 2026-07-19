"use server";

import { revalidatePath } from "next/cache";
import {
  storeInputSchema,
  resolveAuthIdentifier,
  displayIdentifier,
  type StoreInput,
  type StoreStatus,
} from "@grocery/shared";
import { createStore, updateStore, setStoreStatus, getStoreOwner } from "@grocery/db/queries";
import { createAdminClient } from "@grocery/db/admin";
import { requireOpsProfile, isAdmin } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

export interface VendorActionResult {
  ok: boolean;
  error?: string;
  storeId?: string;
  userId?: string;
  /** Login shown back to the admin (real email, or "+92..." for a phone account). */
  identifier?: string;
  full_name?: string;
  /** Temp password for a freshly-created account (shown once to the admin). */
  tempPassword?: string;
  hasOwner?: boolean;
}

async function assertAdmin() {
  const profile = await requireOpsProfile();
  if (!isAdmin(profile.role)) throw new Error("Forbidden");
}

function tempPassword() {
  return `Gv-${crypto.randomUUID().slice(0, 8)}!`;
}

/**
 * Step 1 of vendor onboarding: create the owner's login only (role stock_keeper,
 * no store yet). A vendor with no linked store can't do anything useful in ops
 * (see requireOpsProfile / the dashboard layout guard) — step 2 (createShopForOwnerAction)
 * must follow to actually let them in.
 */
export async function createVendorUserAction(input: {
  identifier: string;
  full_name: string;
}): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const identifier = input.identifier.trim();
  const fullName = input.full_name.trim();
  if (!identifier || !fullName) return { ok: false, error: "Name and email/phone are required" };

  try {
    const { authEmail, phone } = resolveAuthIdentifier(identifier);
    const admin = createAdminClient();
    const password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (error || !data.user) {
      return { ok: false, error: `Vendor invite failed: ${error?.message}` };
    }
    // Profile is auto-created (role 'customer') by the signup trigger; elevate it.
    const { error: roleErr } = await admin
      .from("profiles")
      .update({ role: "stock_keeper", full_name: fullName, phone })
      .eq("id", data.user.id);
    if (roleErr)
      return { ok: false, error: `Vendor created, but role update failed: ${roleErr.message}` };

    return {
      ok: true,
      userId: data.user.id,
      tempPassword: password,
      identifier: displayIdentifier(authEmail),
      full_name: fullName,
    };
  } catch (e) {
    return {
      ok: false,
      error: `Vendor invite failed: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }
}

/**
 * Step 2 of vendor onboarding: create the store and link it to the owner created in
 * step 1. Runs under the admin's own RLS (no service-role needed here). New stores
 * start in `onboarding` and go live only when an admin activates them.
 */
export async function createShopForOwnerAction(input: {
  ownerId: string;
  store: StoreInput;
}): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const parsed = storeInputSchema.safeParse(input.store);
  if (!parsed.success) return { ok: false, error: "Invalid store details" };

  const supabase = await getServerSupabase();
  try {
    const storeId = await createStore(supabase, parsed.data);
    await setStoreStatus(supabase, storeId, "onboarding");
    const { error: memberErr } = await supabase
      .from("store_members")
      .insert({ store_id: storeId, user_id: input.ownerId, store_role: "owner" });
    if (memberErr) {
      return {
        ok: false,
        storeId,
        error: `Shop created, but linking the owner failed: ${memberErr.message}`,
      };
    }
    revalidatePath("/vendors");
    return { ok: true, storeId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create shop" };
  }
}

/** Admin creates a rider account. Riders never self-register — this is the only way one exists. */
export async function createRiderAction(input: {
  identifier: string;
  full_name: string;
}): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const identifier = input.identifier.trim();
  const fullName = input.full_name.trim();
  if (!identifier || !fullName) return { ok: false, error: "Name and email/phone are required" };

  try {
    const { authEmail, phone } = resolveAuthIdentifier(identifier);
    const admin = createAdminClient();
    const password = tempPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (error || !data.user) {
      return { ok: false, error: `Rider invite failed: ${error?.message}` };
    }
    const { error: profileErr } = await admin
      .from("profiles")
      .update({ role: "rider", full_name: fullName, phone })
      .eq("id", data.user.id);
    if (profileErr)
      return { ok: false, error: `Rider created, but role update failed: ${profileErr.message}` };

    revalidatePath("/accounts");
    return {
      ok: true,
      tempPassword: password,
      identifier: displayIdentifier(authEmail),
      full_name: fullName,
    };
  } catch (e) {
    return {
      ok: false,
      error: `Rider invite failed: ${e instanceof Error ? e.message : "unknown error"}`,
    };
  }
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

/** Fetch a store's linked owner (name + current login identifier) for the edit drawer. */
export async function getVendorOwnerAction(storeId: string): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  try {
    const owner = await getStoreOwner(await getServerSupabase(), storeId);
    if (!owner) return { ok: true, hasOwner: false };

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(owner.id);
    if (error || !data.user) return { ok: false, error: "Could not load the owner's login" };

    return {
      ok: true,
      hasOwner: true,
      userId: owner.id,
      full_name: owner.full_name,
      identifier: data.user.email ? displayIdentifier(data.user.email) : "",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load owner" };
  }
}

/** Update the linked owner's name and/or login identifier (email or phone). Password is untouched. */
export async function updateVendorOwnerAction(input: {
  ownerId: string;
  full_name: string;
  identifier: string;
}): Promise<VendorActionResult> {
  try {
    await assertAdmin();
  } catch {
    return { ok: false, error: "Forbidden" };
  }

  const fullName = input.full_name.trim();
  const identifier = input.identifier.trim();
  if (!fullName || !identifier)
    return { ok: false, error: "Owner name and email/phone are required" };

  try {
    const { authEmail, phone } = resolveAuthIdentifier(identifier);
    const admin = createAdminClient();
    const { error: authErr } = await admin.auth.admin.updateUserById(input.ownerId, {
      email: authEmail,
      email_confirm: true,
    });
    if (authErr) return { ok: false, error: `Could not update login: ${authErr.message}` };

    const { error: profileErr } = await admin
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", input.ownerId);
    if (profileErr)
      return {
        ok: false,
        error: `Login updated, but profile update failed: ${profileErr.message}`,
      };

    revalidatePath("/vendors");
    return { ok: true, identifier: displayIdentifier(authEmail), full_name: fullName };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update owner" };
  }
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
