const test = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");
const { parseWebsiteUpgradeIntent } = loadTS("utils/websiteUpgradeIntent.ts");
const id = "f87af21b-561b-4a6c-9013-21bc2c819326";
const metadata = {
  upgrade_intent: "pro",
  upgrade_intent_id: id,
  upgrade_intent_billing: "monthly",
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("only a pending, valid Pro navigation preference is accepted", () => {
  assert.equal(parseWebsiteUpgradeIntent(null), null);
  assert.equal(parseWebsiteUpgradeIntent({ signup_plan: "free" }), null);
  assert.equal(
    parseWebsiteUpgradeIntent({ ...metadata, upgrade_intent: "admin" }),
    null,
  );
  assert.equal(
    parseWebsiteUpgradeIntent({
      ...metadata,
      upgrade_intent_id: "javascript:alert(1)",
    }),
    null,
  );
  assert.equal(
    parseWebsiteUpgradeIntent({ ...metadata, upgrade_intent_consumed_id: id }),
    null,
  );
  assert.equal(parseWebsiteUpgradeIntent(metadata).billing, "monthly");
  assert.equal(
    parseWebsiteUpgradeIntent({
      ...metadata,
      upgrade_intent_billing: "anything",
    }).billing,
    "annual",
  );
  assert.equal(
    parseWebsiteUpgradeIntent({
      ...metadata,
      upgrade_intent_consumed_id: "previous-intent",
    }).id,
    id,
  );
});

test("service reads current server user and acknowledges without changing subscription or newer intent fields", async () => {
  const writes = [];
  let generation = 1;
  let currentId = "member";
  const auth = {
    getUser: async () => ({
      data: { user: { id: currentId, user_metadata: metadata } },
      error: null,
    }),
    getSession: async () => ({
      data: { session: { user: { id: currentId } } },
      error: null,
    }),
    updateUser: async (update) => {
      writes.push(update);
      return { error: null };
    },
  };
  const service = loadTS("services/websiteUpgradeIntent.ts", {
    "@/lib/supabase": { supabase: { auth } },
    "@/lib/sessionGeneration": { sessionGeneration: () => generation },
    "@/utils/websiteUpgradeIntent": { parseWebsiteUpgradeIntent },
  });
  assert.equal((await service.fetchWebsiteUpgradeIntent("member")).id, id);
  assert.equal(
    await service.acknowledgeWebsiteUpgradeIntent("member", id),
    true,
  );
  assert.deepEqual(Object.keys(writes[0].data).sort(), [
    "upgrade_intent_consumed_at",
    "upgrade_intent_consumed_id",
  ]);
  currentId = "another-member";
  assert.equal(await service.fetchWebsiteUpgradeIntent("member"), null);
  assert.equal(
    await service.acknowledgeWebsiteUpgradeIntent("member", id),
    false,
  );
  assert.equal(writes.length, 1);
  auth.getUser = async () => {
    generation++;
    return {
      data: { user: { id: "member", user_metadata: metadata } },
      error: null,
    };
  };
  assert.equal(await service.fetchWebsiteUpgradeIntent("member"), null);
});

function harness() {
  const state = {
    session: { user: { id: "member" } },
    isHydrating: false,
    needsOnboarding: false,
    profile: { pro: false },
  };
  const events = [];
  let path = "/dashboard";
  let pending = { id, billing: "monthly" };
  let generation = 1;
  let effect;
  let cleanup;
  let foreground;
  let deferred;
  let ackFails = false;
  const refs = [];
  let refIndex;
  const store = (selector) => selector(state);
  store.getState = () => state;
  const router = {
    push: (href) => events.push(["push", href]),
    setParams: (params) => events.push(["params", params]),
  };
  const { useWebsiteUpgradeIntent } = loadTS(
    "hooks/useWebsiteUpgradeIntent.ts",
    {
      react: {
        useRef: (initial) => (refs[refIndex++] ||= { current: initial }),
        useEffect: (cb) => {
          effect = cb;
        },
      },
      "react-native": {
        AppState: {
          addEventListener: (_event, cb) => {
            foreground = cb;
            return { remove() {} };
          },
        },
      },
      "expo-router": {
        useRouter: () => router,
        usePathname: () => path,
        useRootNavigationState: () => ({ key: "root" }),
      },
      "@/stores/authStore": { useAuthStore: store },
      "@/lib/crittrPro": {
        isCrittrProFromProfile: (profile) => profile?.pro === true,
      },
      "@/lib/sessionGeneration": { sessionGeneration: () => generation },
      "@/services/websiteUpgradeIntent": {
        fetchWebsiteUpgradeIntent: async () => {
          events.push(["fetch"]);
          return deferred ? await deferred : pending;
        },
        acknowledgeWebsiteUpgradeIntent: async (_userId, intentId) => {
          events.push(["ack", intentId]);
          if (ackFails) throw new Error("offline");
          pending = null;
          return true;
        },
      },
    },
  );
  function HookHarness() {
    useWebsiteUpgradeIntent();
  }
  return {
    state,
    events,
    render(nextPath = path) {
      cleanup?.();
      path = nextPath;
      refIndex = 0;
      HookHarness();
      cleanup = effect();
    },
    setDeferred(value) {
      deferred = value;
    },
    failAck() {
      ackFails = true;
    },
    switchUser() {
      state.session.user.id = "other";
      generation++;
    },
    foreground() {
      foreground?.("active");
    },
  };
}

test("waits for onboarding; consumes only after the paywall is present and applies monthly preference", async () => {
  const h = harness();
  h.state.needsOnboarding = true;
  h.render();
  await tick();
  assert.equal(h.events.length, 0);
  h.state.needsOnboarding = false;
  h.render();
  await tick();
  assert.equal(
    h.events.find((e) => e[0] === "push")[1].params.billing,
    "monthly",
  );
  assert.equal(h.events.filter((e) => e[0] === "ack").length, 0);
  h.render("/upgrade");
  await tick();
  assert.equal(h.events.find((e) => e[0] === "params")[1].billing, "monthly");
  assert.equal(h.events.filter((e) => e[0] === "ack").length, 1);
  h.render("/dashboard");
  await tick();
  assert.equal(h.events.filter((e) => e[0] === "push").length, 1);
});

test("does not duplicate onboarding's existing paywall or reopen it after offline acknowledgement", async () => {
  const h = harness();
  h.failAck();
  h.render("/upgrade");
  await tick();
  h.render("/dashboard");
  await tick();
  h.foreground();
  await tick();
  assert.equal(h.events.filter((e) => e[0] === "push").length, 0);
  assert.ok(h.events.filter((e) => e[0] === "ack").length >= 2);
});

test("existing Pro members consume the preference without opening a paywall", async () => {
  const h = harness();
  h.state.profile.pro = true;
  h.render();
  await tick();
  assert.equal(h.events.filter((e) => e[0] === "push").length, 0);
  assert.equal(h.events.filter((e) => e[0] === "ack").length, 1);
});

test("checkout is never interrupted, and a sign-out/account switch fences an in-flight read", async () => {
  const h = harness();
  h.render("/pro-checkout");
  await tick();
  assert.equal(h.events.length, 0);
  let resolve;
  h.setDeferred(
    new Promise((r) => {
      resolve = r;
    }),
  );
  h.render("/dashboard");
  h.switchUser();
  resolve({ id, billing: "monthly" });
  await tick();
  assert.equal(
    h.events.filter((e) => e[0] === "push" || e[0] === "ack").length,
    0,
  );
});
