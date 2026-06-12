"use client";
import { createClient } from "@grocery/db/browser";

export function getBrowserSupabase() {
  return createClient();
}
