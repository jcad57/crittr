const { Buffer } = require("node:buffer");
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { focusManager, onlineManager } = require("@tanstack/react-query");
const { loadTS } = require("./load-typescript.cjs");
test("secure storage replacement preserves old data on failure and handles UTF-8", async () => {
  const { createLargeSecureStore, splitUtf8 } = loadTS(
    "lib/largeSecureStore.ts",
  );
  const values = new Map();
  let fail = false;
  const storage = createLargeSecureStore({
    getItemAsync: async (k) => values.get(k) ?? null,
    deleteItemAsync: async (k) => {
      values.delete(k);
    },
    setItemAsync: async (k, v) => {
      if (fail && k.includes("__lss2__")) throw Error("disk full");
      values.set(k, v);
    },
  });
  const old = "🐈".repeat(1500);
  await storage.setItem("session", old);
  fail = true;
  await assert.rejects(() => storage.setItem("session", "a".repeat(6000)));
  assert.equal(await storage.getItem("session"), old);
  for (const chunk of splitUtf8(old))
    assert.ok(Buffer.byteLength(chunk, "utf8") <= 1800);
  fail = false;
  await storage.setItem("session", "short");
  assert.equal(await storage.getItem("session"), "short");
  assert.equal(values.size, 1);
  await storage.removeItem("session");
  assert.equal(values.size, 0);
});
test("long resume restores focus and connectivity is reactive", async () => {
  let appListener,
    networkListener,
    clock = Date.now(),
    cancelled = 0;
  class FakeDate extends Date {
    static now() {
      return clock;
    }
  }
  const { setupAppResumeHandler } = loadTS(
    "lib/appResumeHandler.ts",
    {
      "@/lib/appLifecycle": { normalizeAppState: (s) => s ?? "unknown" },
      "@tanstack/react-query": { focusManager, onlineManager },
      "expo-network": {
        addNetworkStateListener: (fn) => {
          networkListener = fn;
          return { remove() {} };
        },
        getNetworkStateAsync: async () => ({ isConnected: true }),
      },
      "@/lib/query/client": {
        queryClient: {
          cancelQueries: async () => {
            cancelled++;
          },
        },
      },
      "@/lib/supabase": {
        supabase: {
          auth: {
            startAutoRefresh: async () => {},
            stopAutoRefresh: async () => {},
          },
        },
      },
      "react-native": {
        Platform: { OS: "ios" },
        AppState: {
          currentState: "active",
          addEventListener: (_, fn) => {
            appListener = fn;
            return { remove() {} };
          },
        },
      },
    },
    { Date: FakeDate },
  );
  const dispose = setupAppResumeHandler();
  appListener("background");
  clock += 60000;
  appListener("active");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(focusManager.isFocused(), true);
  assert.equal(cancelled, 1);
  networkListener({ isConnected: false });
  assert.equal(onlineManager.isOnline(), false);
  networkListener({ isConnected: true, isInternetReachable: true });
  assert.equal(onlineManager.isOnline(), true);
  dispose();
});
