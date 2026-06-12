// Edge Function: on-order-assigned
//
// Called (e.g. via a DB webhook or directly from the ops console) when an order
// is assigned to a rider. MVP: structured stub that validates the payload and
// logs. Extension point for push notifications / SMS to the rider.
//
// Deploy: supabase functions deploy on-order-assigned
// Secrets are read from the function environment — never hardcode them.

import { createClient } from "jsr:@supabase/supabase-js@2";

interface Payload {
  order_id: string;
  rider_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.order_id || !body?.rider_id) {
    return new Response(JSON.stringify({ error: "order_id and rider_id required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Service-role client from the function environment (auto-injected by Supabase).
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rider } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", body.rider_id)
    .single();

  // TODO(post-MVP): dispatch push/SMS to rider here.
  console.log(`Order ${body.order_id} assigned to rider ${rider?.full_name ?? body.rider_id}`);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
