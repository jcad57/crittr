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

/**
 * Expo SecureStore warns (and plans to throw in a future SDK) when a single value
 * exceeds 2048 bytes. Supabase's persisted session (access JWT + refresh token +
 * `user` with metadata) routinely exceeds that once custom claims/metadata are
 * attached. To keep the session securely in the iOS keychain / Android Keystore
 * without tripping the limit, we split values into chunks of ≤ 1800 bytes and
 * track them with a small manifest stored at the original key.
 *
 * Layout:
 *   <key>              → JSON manifest `{ __lss: 1, count: N }` (only when chunked)
 *   <key>__lss__0..N-1 → chunk strings
 *
 * If a legacy (un-chunked) value already exists at `<key>`, we still return it
 * transparently so existing sessions survive the upgrade — the next write will
 * migrate it to the chunked layout.
 */
const SECURE_STORE_CHUNK_SIZE = 1800;
const CHUNK_KEY_SUFFIX = "__lss__";

type LargeSecureStoreManifest = { __lss: 1; count: number };

function isManifest(value: unknown): value is LargeSecureStoreManifest {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __lss?: unknown }).__lss === 1 &&
    typeof (value as { count?: unknown }).count === "number"
  );
}

async function removeChunkedValue(key: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    try {
      await SecureStore.deleteItemAsync(`${key}${CHUNK_KEY_SUFFIX}${i}`);
    } catch {
      /* best-effort cleanup */
    }
  }
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const head = await SecureStore.getItemAsync(key);
    if (head == null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(head);
    } catch {
      return head;
    }
    if (!isManifest(parsed)) return head;

    const chunks: string[] = [];
    for (let i = 0; i < parsed.count; i++) {
      const chunk = await SecureStore.getItemAsync(
        `${key}${CHUNK_KEY_SUFFIX}${i}`,
      );
      if (chunk == null) return null;
      chunks.push(chunk);
    }
    return chunks.join("");
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const existingHead = await SecureStore.getItemAsync(key);
    if (existingHead != null) {
      try {
        const parsed: unknown = JSON.parse(existingHead);
        if (isManifest(parsed)) {
          await removeChunkedValue(key, parsed.count);
        }
      } catch {
        /* legacy value — will be overwritten below */
      }
    }

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunkCount = Math.ceil(value.length / SECURE_STORE_CHUNK_SIZE);
    for (let i = 0; i < chunkCount; i++) {
      const start = i * SECURE_STORE_CHUNK_SIZE;
      const chunk = value.slice(start, start + SECURE_STORE_CHUNK_SIZE);
      await SecureStore.setItemAsync(`${key}${CHUNK_KEY_SUFFIX}${i}`, chunk);
    }
    const manifest: LargeSecureStoreManifest = { __lss: 1, count: chunkCount };
    await SecureStore.setItemAsync(key, JSON.stringify(manifest));
  },
  removeItem: async (key: string): Promise<void> => {
    const head = await SecureStore.getItemAsync(key);
    if (head != null) {
      try {
        const parsed: unknown = JSON.parse(head);
        if (isManifest(parsed)) {
          await removeChunkedValue(key, parsed.count);
        }
      } catch {
        /* legacy value; just delete the primary key below */
      }
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Hard client-side timeout for every Supabase HTTP request.
 *
 * iOS/Android can suspend in-flight `fetch()` calls when the app backgrounds. These
 * sockets often never resolve *or* reject after resume, which leaves React Query
 * queries permanently in `isFetching: true` and the UI stuck on a loading screen.
 *
 * Wrapping the client's fetch with an AbortController ensures every request fails
 * loudly after the timeout, so retry / invalidate logic can actually run.
 *
 * Edge Functions that call external LLMs (Claude Vision on medical-record PDFs,
 * Crittr-AI chat streaming) routinely take 30-90s. The default PostgREST ceiling
 * would abort those mid-flight — surfaced in RN as a generic "Network request
 * failed" — so `/functions/v1/` paths get a much longer ceiling.
 */
const SUPABASE_FETCH_TIMEOUT_MS = 30_000;
const SUPABASE_EDGE_FUNCTION_TIMEOUT_MS = 150_000;

function resolveTimeoutMs(input: RequestInfo | URL): number {
  let url: string | null = null;
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (
    input &&
    typeof (input as { url?: unknown }).url === "string"
  ) {
    url = (input as { url: string }).url;
  }

  if (url && url.includes("/functions/v1/")) {
    return SUPABASE_EDGE_FUNCTION_TIMEOUT_MS;
  }
  return SUPABASE_FETCH_TIMEOUT_MS;
}

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    resolveTimeoutMs(input),
  );

  const userSignal = init?.signal ?? null;
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort();
    } else {
      userSignal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
  /** PostgREST statement timeout header — complements the client-side fetch abort above. */
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
    await ExpoSecureStoreAdapter.removeItem(getSupabaseAuthStorageKey());
  } catch {
    /* key missing or SecureStore error */
  }
}
