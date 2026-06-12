"use client";
import { createClient } from "@grocery/db/browser";

/** Browser Supabase client for Client Components (realtime, mutations). */
export function getBrowserSupabase() {
  return createClient();
}
