// Edge Function: phone-signup
//
// Customers can sign up with a phone number instead of email. Supabase's
// email/password auth is reused underneath: the phone is mapped to a
// synthetic "<digits>@phone.internal" address (mirrors
// packages/shared/src/auth.ts) and the account is created + auto-confirmed
// via the service-role admin API — this runs only inside the function
// environment, never in the shop app bundle. Real email signups are
// unaffected and still go through Supabase's normal confirmation-link flow.
//
// The client calls this function first, then signs in itself with
// supabase.auth.signInWithPassword({ email: syntheticEmail, password }).
//
// Deploy: supabase functions deploy phone-signup

import { createClient } from "jsr:@supabase/supabase-js@2";

const SYNTHETIC_PHONE_EMAIL_DOMAIN = "phone.internal";
const DEFAULT_COUNTRY_CODE = "92";

interface Payload {
  phone: string;
  password: string;
  full_name?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("0")) return `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
  if (digits.startsWith(DEFAULT_COUNTRY_CODE)) return `+${digits}`;
  return `+${DEFAULT_COUNTRY_CODE}${digits}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.phone?.trim() || !body.password || body.password.length < 6) {
    return json({ error: "phone and a password (min 6 chars) are required" }, 400);
  }

  const phone = normalizePhone(body.phone);
  if (phone.replace(/[^\d]/g, "").length < 11) {
    return json({ error: "Enter a valid phone number" }, 400);
  }
  const email = `${phone.replace("+", "")}@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name ?? "", phone },
  });

  if (error || !data.user) {
    const message = error?.message.includes("already been registered")
      ? "This phone number is already registered"
      : (error?.message ?? "Could not create account");
    return json({ error: message }, 409);
  }

  return json({ ok: true, email });
});
