// Manually reset one account's password. Service-role (bypasses RLS).
//
// Run from the repo root:
//   node --env-file=.env apps/ops/scripts/reset-password.mjs --list
//   node --env-file=.env apps/ops/scripts/reset-password.mjs <email-or-phone> [new-password]
//
// The identifier is whatever the person signs in with — a real email, or a phone
// number (+923001234567 / 03001234567), which maps to the synthetic auth email
// described in packages/shared/src/auth.ts. Omit the password to get a generated one.
// Non-destructive: only auth.users.encrypted_password changes.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

// Mirrors packages/shared/src/auth.ts (plain .mjs — no TS build step here).
const PHONE_DOMAIN = "phone.internal";
function resolveAuthEmail(identifier) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  const e164 = trimmed.startsWith("+")
    ? digits
    : digits.startsWith("0")
      ? `92${digits.slice(1)}`
      : digits.startsWith("92")
        ? digits
        : `92${digits}`;
  return `${e164}@${PHONE_DOMAIN}`;
}
function displayIdentifier(email) {
  return email.endsWith(`@${PHONE_DOMAIN}`) ? `+${email.split("@")[0]}` : email;
}
function generatePassword() {
  return `Gv-${crypto.randomUUID().slice(0, 8)}!`;
}

async function listUsers() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  return data.users;
}

/** Print every shop owner (store_members.store_role = 'owner') with its store. */
async function list() {
  const { data: members, error } = await admin
    .from("store_members")
    .select("user_id, stores(name, slug, status)")
    .eq("store_role", "owner");
  if (error) throw error;

  const users = await listUsers();
  const byId = new Map(users.map((u) => [u.id, u]));
  const { data: profiles } = await admin.from("profiles").select("id, full_name, role");
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  console.log(`Shop owners (${members.length}) on ${new URL(url).host}:\n`);
  for (const m of members) {
    const email = byId.get(m.user_id)?.email;
    const p = profileById.get(m.user_id);
    console.log(`  ${p?.full_name ?? "(no profile)"} — ${email ? displayIdentifier(email) : "(no auth user)"}`);
    console.log(`    store: ${m.stores?.name ?? "-"} (${m.stores?.slug ?? "-"}, ${m.stores?.status ?? "-"})`);
    console.log(`    role : ${p?.role ?? "-"}   last sign-in: ${byId.get(m.user_id)?.last_sign_in_at ?? "never"}\n`);
  }
  console.log("Reset one with:  node --env-file=.env apps/ops/scripts/reset-password.mjs <email-or-phone>");
}

async function reset(identifier, requested) {
  const authEmail = resolveAuthEmail(identifier);
  const user = (await listUsers()).find((u) => u.email?.toLowerCase() === authEmail.toLowerCase());
  if (!user) {
    console.error(`No account found for "${identifier}" (resolved to ${authEmail}).`);
    console.error("Run with --list to see the shop owners.");
    process.exit(1);
  }

  const password = requested || generatePassword();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  if (error) {
    console.error(`Password reset failed: ${error.message}`);
    process.exit(1);
  }

  const { data: p } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  console.log(`✓ Password reset for ${p?.full_name ?? user.id} (${p?.role ?? "unknown role"})`);
  console.log(`  login   : ${displayIdentifier(user.email)}`);
  console.log(`  password: ${password}`);
  console.log(`\nExisting sessions stay valid until they expire — sign the user out in the`);
  console.log(`Supabase dashboard (Auth → Users) if that matters.`);
}

const [arg, maybePassword] = process.argv.slice(2);
if (!arg || arg === "--list" || arg === "-l") {
  await list().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  await reset(arg, maybePassword).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
