import { createNativeClient } from "@grocery/db/native";

/**
 * Shared Supabase client for the rider app (AsyncStorage-backed session).
 * Reads EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY from the env.
 */
export const supabase = createNativeClient();
