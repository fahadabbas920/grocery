// Reset auth users → one clean account per role. Service-role (bypasses RLS).
// Run from repo root:  node --env-file=.env scripts/reset-users.mjs
//
// DESTRUCTIVE: deletes ALL auth users and ALL orders/store_orders/order_items/
// rider_locations (test transactional data). Catalog + stores are preserved.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = process.env.SEED_PASSWORD || "Password123!";

const USERS = [
  { email: "admin@grocery.test", role: "admin", full_name: "Platform Admin" },
  { email: "vendor@grocery.test", role: "stock_keeper", full_name: "Default Store Owner" },
  { email: "rider@grocery.test", role: "rider", full_name: "Test Rider" },
  { email: "customer@grocery.test", role: "customer", full_name: "Test Customer" },
];

async function main() {
  // 1. Clear transactional test data (orders RESTRICT profile deletes; cascades handle the rest).
  console.log("Clearing test orders…");
  for (const table of ["order_items", "store_orders", "orders", "rider_locations"]) {
    const col = table === "order_items" ? "store_order_id" : table === "rider_locations" ? "rider_id" : "id";
    const { error } = await admin.from(table).delete().not(col, "is", null);
    if (error) console.warn(`  ${table}: ${error.message}`);
  }

  // 2. Delete every existing auth user (cascades profiles + store_members).
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw listErr;
  console.log(`Deleting ${list.users.length} existing user(s)…`);
  for (const u of list.users) {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    console.log(`  ${error ? "✗" : "✓"} ${u.email}${error ? " — " + error.message : ""}`);
  }

  // 3. Resolve the default store (for the vendor membership).
  const { data: store } = await admin.from("stores").select("id, name").eq("slug", "default-store").maybeSingle();

  // 4. Create one user per role.
  console.log("\nCreating fresh users:");
  for (const u of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) {
      console.error(`  ✗ ${u.email} — ${error.message}`);
      continue;
    }
    const id = data.user.id;
    // Profile row is auto-created (role 'customer') by the handle_new_user trigger; set role.
    const { error: pErr } = await admin.from("profiles").update({ role: u.role, full_name: u.full_name }).eq("id", id);
    if (pErr) console.warn(`     profile: ${pErr.message}`);
    // Link the vendor to the default store.
    if (u.role === "stock_keeper" && store) {
      const { error: mErr } = await admin
        .from("store_members")
        .insert({ store_id: store.id, user_id: id, store_role: "owner" });
      if (mErr) console.warn(`     membership: ${mErr.message}`);
    }
    console.log(`  ✓ ${u.email}  (${u.role})${u.role === "stock_keeper" && store ? ` → ${store.name}` : ""}`);
  }

  console.log(`\nDone. All accounts use password: ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
