import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Matches the default key used by supabase-js (`sb-<project-ref>-auth-token`).
 * Used to hard-clear SecureStore when auth is invalid so no stale JWT survives `signOut` quirks.
 */
export function getSupabaseAuthStorageKey(): string {
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split(".")[0] || "unknown";
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "sb-unknown-auth-token";
  }
}

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  /** Abort PostgREST requests that stall (bad network / half-open TCP) instead of hanging forever. */
  db: { timeout: 60_000 },
});

/** Clears the persisted Supabase session from the device (local sign-out + SecureStore key). */
export async function wipeSupabaseAuthFromDevice(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* still try to delete storage */
  }
  try {
    await SecureStore.deleteItemAsync(getSupabaseAuthStorageKey());
  } catch {
    /* key missing or SecureStore error */
  }
}
