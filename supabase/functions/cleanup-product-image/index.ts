// Edge Function: cleanup-product-image
//
// Deletes an orphaned object from the `product-images` bucket — call after a
// product is removed or its image replaced, so storage doesn't accumulate junk.
//
// Deploy: supabase functions deploy cleanup-product-image

import { createClient } from "jsr:@supabase/supabase-js@2";

interface Payload {
  image_path: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.image_path) {
    return new Response(JSON.stringify({ error: "image_path required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { error } = await supabase.storage.from("product-images").remove([body.image_path]);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
