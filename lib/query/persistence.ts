import type { Query } from "@tanstack/react-query";
import { queryClient } from "@/lib/query/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  removeOldestQuery,
} from "@tanstack/react-query-persist-client";

const CACHE_SCHEMA_VERSION = "2";
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
const PERSIST_ROOTS = new Set([
  "profile",
  "pets",
  "petDetails",
  "todayActivities",
  "petVetVisits",
  "healthSnapshot",
  "schedule",
]);
let revision = 0,
  activeUserId: string | null = null;
let restorePromise: Promise<void> | null = null;
let stop: (() => void) | undefined;
let writes = Promise.resolve();
const cacheKey = (id: string) => `crittr.reactQueryCache.v2.${id}`;

/** Only restore after identifying the session; old-account reads/writes are fenced. */
export function startQueryCachePersistence(
  userId: string,
  isCurrent = () => true,
): Promise<void> {
  if (activeUserId === userId && restorePromise) return restorePromise;
  stop?.();
  stop = undefined;
  const generation = ++revision;
  activeUserId = userId;
  const current = () => revision === generation && isCurrent();
  const persister = createAsyncStoragePersister({
    key: cacheKey(userId),
    throttleTime: 2000,
    retry: removeOldestQuery,
    storage: {
      getItem: async (key) => {
        const raw = await AsyncStorage.getItem(key);
        return current() ? raw : null;
      },
      setItem: (key, value) => {
        const task = writes.then(async () => {
          if (current()) await AsyncStorage.setItem(key, value);
        });
        writes = task.catch(() => {});
        return task;
      },
      removeItem: (key) => AsyncStorage.removeItem(key),
    },
  });
  const options = {
    queryClient,
    persister,
    buster: CACHE_SCHEMA_VERSION,
    maxAge: MAX_CACHE_AGE_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) =>
        query.state.status === "success" &&
        PERSIST_ROOTS.has(String(query.queryKey[0])) &&
        (!["profile", "pets"].includes(String(query.queryKey[0])) ||
          query.queryKey[1] === userId),
    },
  };
  restorePromise = persistQueryClientRestore(options)
    .then(() => {
      if (current()) stop = persistQueryClientSubscribe(options);
    })
    .catch((error) => {
      if (__DEV__) console.warn("[queryPersistence] restore failed", error);
    });
  return restorePromise;
}
export async function purgePersistedQueryCache(): Promise<void> {
  const oldId = activeUserId;
  ++revision;
  stop?.();
  stop = undefined;
  activeUserId = null;
  restorePromise = null;
  await writes;
  try {
    await AsyncStorage.multiRemove([
      "crittr.reactQueryCache",
      ...(oldId ? [cacheKey(oldId)] : []),
    ]);
  } catch {
    /* Cache failure must not prevent logout. */
  }
}
