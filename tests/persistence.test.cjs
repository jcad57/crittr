const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
test("query persistence fences delayed restores and allows only scoped shell data", async () => {
  let finishAlice;
  const restored = [],
    subscriptions = [],
    configs = [];
  const cache = loadTS("lib/query/persistence.ts", {
    "@/lib/query/client": { queryClient: {} },
    "@react-native-async-storage/async-storage": {
      __esModule: true,
      default: {
        getItem: async (key) =>
          key.endsWith(".alice")
            ? new Promise((resolve) => {
                finishAlice = resolve;
              })
            : "bob-cache",
        setItem: async () => {},
        multiRemove: async () => {},
        removeItem: async () => {},
      },
    },
    "@tanstack/query-async-storage-persister": {
      createAsyncStoragePersister: (config) => {
        configs.push(config);
        return config;
      },
    },
    "@tanstack/react-query-persist-client": {
      persistQueryClientRestore: async (options) => {
        const value = await options.persister.storage.getItem(
          options.persister.key,
        );
        if (value) restored.push(value);
      },
      persistQueryClientSubscribe: (options) => {
        subscriptions.push(options);
        return () => {};
      },
      removeOldestQuery: () => {},
    },
  });
  const alice = cache.startQueryCachePersistence("alice");
  await Promise.resolve();
  await cache.purgePersistedQueryCache();
  await cache.startQueryCachePersistence("bob");
  finishAlice("alice-private-data");
  await alice;
  assert.deepEqual(restored, ["bob-cache"]);
  assert.equal(subscriptions.length, 1);
  const allow = subscriptions[0].dehydrateOptions.shouldDehydrateQuery;
  const query = (key, status = "success") => ({
    queryKey: key,
    state: { status },
  });
  assert.equal(allow(query(["profile", "bob"])), true);
  assert.equal(allow(query(["profile", "alice"])), false);
  assert.equal(allow(query(["crittrAiThread", "bob"])), false);
  assert.equal(allow(query(["pets", "bob"], "pending")), false);
  await cache.purgePersistedQueryCache();
});
