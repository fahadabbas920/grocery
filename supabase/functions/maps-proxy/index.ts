// Edge Function: maps-proxy
//
// Server-side geocoding proxy. The frontend never talks to Mapbox/Google
// directly for search or reverse-geocode — it calls this function instead.
// The active provider is read from `app_settings.maps_provider`; the
// provider's SECRET key lives only as a function secret, never in a
// client-readable table and never in the Next.js bundle:
//
//   supabase secrets set MAPBOX_SECRET_TOKEN=sk.xxxxx
//   supabase secrets set GOOGLE_MAPS_SERVER_KEY=xxxxx
//
// Deploy: supabase functions deploy maps-proxy
//
// Map *rendering* (tiles/markers) still needs a public, domain-restricted
// token in the browser — that one is intentionally public and is served
// from `app_settings.maps_public_token`, not from this function.

import { createClient } from "jsr:@supabase/supabase-js@2";

type Action = "geocode" | "reverseGeocode";

interface Payload {
  action: Action;
  query?: string;
  lat?: number;
  lng?: number;
}

interface GeocodeResult {
  id: string;
  place_name: string;
  center: [number, number];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function mapboxGeocode(query: string, token: string): Promise<GeocodeResult[]> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${token}&country=PK&limit=5&language=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []) as GeocodeResult[];
}

async function mapboxReverseGeocode(lat: number, lng: number, token: string): Promise<string> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${token}&types=address,place,neighborhood,locality&limit=1&language=en`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  return data.features?.[0]?.place_name ?? "";
}

async function googleGeocode(query: string, key: string): Promise<GeocodeResult[]> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map(
    (r: {
      place_id: string;
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }) => ({
      id: r.place_id,
      place_name: r.formatted_address,
      center: [r.geometry.location.lng, r.geometry.location.lat] as [number, number],
    }),
  );
}

async function googleReverseGeocode(lat: number, lng: number, key: string): Promise<string> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const data = await res.json();
  return data.results?.[0]?.formatted_address ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Require a signed-in caller — this proxy makes billed provider calls.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const body = (await req.json().catch(() => null)) as Payload | null;
  if (!body?.action) {
    return json({ error: "action required" }, 400);
  }

  const { data: providerRow } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "maps_provider")
    .maybeSingle();
  const provider = (providerRow?.value as string | null) ?? "none";

  try {
    if (provider === "mapbox") {
      const token = Deno.env.get("MAPBOX_SECRET_TOKEN");
      if (!token) return json({ error: "MAPBOX_SECRET_TOKEN not configured" }, 500);

      if (body.action === "geocode") {
        if (!body.query?.trim()) return json({ results: [] });
        return json({ results: await mapboxGeocode(body.query, token) });
      }
      if (body.action === "reverseGeocode") {
        if (body.lat == null || body.lng == null) return json({ address: "" });
        return json({ address: await mapboxReverseGeocode(body.lat, body.lng, token) });
      }
    }

    if (provider === "google") {
      const key = Deno.env.get("GOOGLE_MAPS_SERVER_KEY");
      if (!key) return json({ error: "GOOGLE_MAPS_SERVER_KEY not configured" }, 500);

      if (body.action === "geocode") {
        if (!body.query?.trim()) return json({ results: [] });
        return json({ results: await googleGeocode(body.query, key) });
      }
      if (body.action === "reverseGeocode") {
        if (body.lat == null || body.lng == null) return json({ address: "" });
        return json({ address: await googleReverseGeocode(body.lat, body.lng, key) });
      }
    }

    return json({ results: [], address: "" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Proxy error" }, 502);
  }
});
