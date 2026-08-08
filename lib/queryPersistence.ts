import { queryClient } from "@/lib/queryClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  persistQueryClient,
  removeOldestQuery,
} from "@tanstack/react-query-persist-client";

const CACHE_KEY = "crittr.reactQueryCache";

/**
 * Bump whenever a persisted query's payload shape changes. Restored data is
 * rendered before any network response arrives, so an old shape would reach
 * components that no longer understand it.
 */
const CACHE_SCHEMA_VERSION = "1";

/**
 * Entitlement and price state must come from RevenueCat on every launch — a
 * restored "Pro" payload would unlock gated UI before the SDK answers, and a
 * restored price would render a number we might not be able to charge.
 */
const NEVER_PERSIST_ROOT_KEYS = new Set([
  "subscriptionDetails",
  "proPricing",
]);

/** Older than this and we discard the whole cache rather than paint stale data. */
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_KEY,
  /**
   * Android's AsyncStorage has a fixed total size budget; dropping the oldest
   * query and retrying keeps a large cache from failing to persist entirely.
   */
  retry: removeOldestQuery,
  throttleTime: 2_000,
});

let restorePromise: Promise<void> | null = null;

/**
 * Rehydrate the query cache from disk and keep writing it back as it changes.
 * Awaited by the boot gate so the first painted frame already has the user's
 * pets, profile and health data instead of spinners.
 */
export function startQueryCachePersistence(): Promise<void> {
  if (restorePromise) return restorePromise;

  const [, promise] = persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_CACHE_AGE_MS,
    buster: CACHE_SCHEMA_VERSION,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        if (query.state.status !== "success") return false;
        const root = query.queryKey[0];
        return typeof root === "string" && !NEVER_PERSIST_ROOT_KEYS.has(root);
      },
    },
  });

  restorePromise = promise.catch((e) => {
    if (__DEV__) console.warn("[queryPersistence] restore failed", e);
  });

  return restorePromise;
}

/**
 * Drop the on-disk cache. Must run on sign-out and on invalid-session purge so
 * the next account on this device never restores the previous user's data.
 */
export async function purgePersistedQueryCache(): Promise<void> {
  try {
    await persister.removeClient();
  } catch (e) {
    if (__DEV__) console.warn("[queryPersistence] purge failed", e);
  }
}
