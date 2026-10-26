import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";
import { secureStorage } from "@/lib/secureStorage";

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
 *
 * Medical-record PDFs (and other uploads) go through `/storage/v1/` as a single
 * PUT with the full body; on slower networks or multi‑MB files the same 30s
 * default aborts before the upload finishes, which looks like a broken network
 * right after adding AI workflows that encourage larger documents.
 */
const SUPABASE_FETCH_TIMEOUT_MS = 30_000;
const SUPABASE_EDGE_FUNCTION_TIMEOUT_MS = 150_000;
/** Large PDFs / photos to Storage; keep in line with edge ceiling so "Create" outlasts the upload. */
const SUPABASE_STORAGE_UPLOAD_TIMEOUT_MS = 150_000;

function resolveTimeoutMs(input: RequestInfo | URL): number {
  let url: string | null = null;
  if (typeof input === "string") {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (typeof Request !== "undefined" && input instanceof Request) {
    url = input.url;
  } else if (
    input &&
    typeof (input as { url?: unknown }).url === "string"
  ) {
    url = (input as { url: string }).url;
  }

  if (url && url.includes("/functions/v1/")) {
    return SUPABASE_EDGE_FUNCTION_TIMEOUT_MS;
  }
  if (url && url.includes("/storage/v1/")) {
    return SUPABASE_STORAGE_UPLOAD_TIMEOUT_MS;
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
  const onAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort();
    } else {
      userSignal.addEventListener("abort", onAbort, {
        once: true,
      });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
    userSignal?.removeEventListener("abort", onAbort);
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    /** PKCE for OAuth code exchange in the WebBrowser session (React Native). */
    flowType: "pkce",
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
    await secureStorage.removeItem(getSupabaseAuthStorageKey());
  } catch {
    /* key missing or SecureStore error */
  }
}
