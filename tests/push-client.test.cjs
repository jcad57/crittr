const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadTS } = require("./load-typescript.cjs");

function registrationFixture(options = {}) {
  const rpc = [], nativeCalls = [], deleted = [], storage = new Map(options.registration ? [["crittr.pushRegistration", JSON.stringify(options.registration)]] : []);
  let generation = 0;
  const module = loadTS("services/pushTokens.ts", {
    "expo-constants": { __esModule: true, default: { easConfig: { projectId: "project" } } },
    "react-native": { Platform: { OS: "ios" } },
    "expo-notifications": {
      PermissionStatus: { GRANTED: "granted" },
      getExpoPushTokenAsync: async (config) => {
        nativeCalls.push(config);
        if (options.changed) generation++;
        return { data: options.token ?? "ExpoPushToken[phone]" };
      },
    },
    "@/lib/pushNotifications": {
      ensureAndroidDefaultNotificationChannel: async () => {},
      getNotificationPermissionStatus: async () => "granted",
    },
    "@/lib/sessionGeneration": { sessionGeneration: () => generation },
    "@/services/reminderNotificationSchedule": {
      initializeCareTimeZone: async () => {},
      cancelCrittrScheduledNotifications: async () => {},
      syncCrittrReminderNotifications: async () => {},
      reportReminderSetupFailure: () => {},
    },
    "@/utils/async": loadTS("utils/async.ts"),
    "@/lib/secureStorage": { secureStorage: {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      removeItem: async (key) => storage.delete(key),
    } },
    "@/lib/supabase": { supabase: {
      auth: { getSession: async () => ({ data: { session: { user: { id: "user" } } } }) },
      rpc: async (name, args) => { rpc.push({ name, args }); return { error: options.failed ? Error("offline") : null }; },
      from: (table) => ({ delete: () => ({ eq: (_column, userId) => ({ eq: async (_tokenColumn, token) => {
        deleted.push({ table, userId, token }); return { error: null };
      } }) }) }),
    } },
  });
  return { module, rpc, nativeCalls, deleted };
}

test("push registration passes a rotated native token through without requesting it again", async () => {
  const f = registrationFixture();
  const nativeToken = { type: "ios", data: "native" };
  await f.module.syncExpoPushTokenToSupabase("user", nativeToken);
  assert.equal(f.nativeCalls[0].devicePushToken, nativeToken);
  assert.equal(f.rpc[0].name, "register_expo_push_token");
  assert.equal(f.rpc[1].name, "activate_device_care_reminders");
  await f.module.unregisterExpoPushToken("user");
  assert.deepEqual(f.deleted.map((row) => row.table), ["user_expo_push_devices", "user_expo_push_tokens"]);
});

test("a delayed token response cannot register after an account change", async () => {
  const f = registrationFixture({ changed: true });
  await f.module.syncExpoPushTokenToSupabase("user");
  assert.equal(f.rpc.length, 0);
});

test("registration errors reach the settings retry surface", async () => {
  const f = registrationFixture({ failed: true });
  await assert.rejects(() => f.module.syncExpoPushTokenToSupabase("user"), /offline/);
});

test("rotating this installation's Expo token retires its previous device registration", async () => {
  const f = registrationFixture({ registration: { userId: "user", token: "ExpoPushToken[old]" } });
  await f.module.syncExpoPushTokenToSupabase("user", { type: "ios", data: "rotated" });
  assert.deepEqual(f.deleted, [{ table: "user_expo_push_devices", userId: "user", token: "ExpoPushToken[old]" }]);
});

test("foreground alerts honor each preference and reject a different or signed-out account", async () => {
  const prefs = loadTS("utils/pushNotificationPreferences.ts", { "@react-native-async-storage/async-storage": {} });
  const categories = { meal_reminder: "notify_meals_treats", treat_reminder: "notify_meals_treats",
    medication_reminder: "notify_medications", exercise_reminder: "notify_co_care_activities",
    vet_reminder: "notify_vet_visits", vaccination_reminder: "notify_vaccinations",
    co_carer_activity_logged: "notify_co_care_activities" };
  for (const [type, key] of Object.entries(categories)) {
    const data = { type, recipient_user_id: "user" };
    assert.equal(prefs.shouldPresentNotification(data, "user", { id: "user" }), true);
    assert.equal(prefs.shouldPresentNotification(data, "user", { id: "user", [key]: false }), false);
    assert.equal(prefs.shouldPresentNotification(data, "other", { id: "other" }), false);
    assert.equal(prefs.shouldPresentNotification(data, undefined, null), false);
  }
  assert.equal(prefs.NOTIFICATION_PREF_KEYS.length, 6);
  assert.equal(prefs.notificationPrefsFromProfile({ id: "user", notify_meals_treats: false, notify_medications: false, notify_co_care_activities: false, notify_vet_visits: false }).notify_vaccinations, false);
  const oldAllOff = { id: "user", notify_meals_treats: false, notify_medications: false, notify_co_care_activities: false, notify_vet_visits: false };
  assert.equal(prefs.mergeNotificationColumnsPreferLiveCache({ ...oldAllOff, notify_vaccinations: false }, oldAllOff).notify_vaccinations, false);
  assert.equal(prefs.notificationPrefsDelta(prefs.defaultNotificationCategoryPrefs(), { ...prefs.defaultNotificationCategoryPrefs(), notify_vaccinations: false }).notify_vaccinations, true);
});

test("iOS provisional permission is usable and Android creates a channel before requesting permission", async () => {
  const calls = [];
  let permission = { granted: false, status: "undetermined", ios: { status: "provisional" } };
  const platform = { OS: "ios" };
  const { getNotificationPermissionStatus, requestNotificationPermissionsAsync } = loadTS("lib/pushNotifications.ts", {
    "react-native": { Platform: platform },
    "expo-notifications": {
      PermissionStatus: { GRANTED: "granted" }, IosAuthorizationStatus: { PROVISIONAL: "provisional" }, AndroidImportance: { HIGH: "high" },
      getPermissionsAsync: async () => permission,
      setNotificationChannelAsync: async () => calls.push("channel"),
      requestPermissionsAsync: async () => calls.push("permission"),
    },
  });
  assert.equal(await getNotificationPermissionStatus(), "granted");
  permission = { granted: false, status: "denied" };
  assert.equal(await getNotificationPermissionStatus(), "denied");
  platform.OS = "android";
  await requestNotificationPermissionsAsync();
  assert.deepEqual(calls, ["channel", "permission"]);
});

test("cold-launch and listener responses navigate once and ignore another account", async () => {
  const routes = [];
  let listener;
  const response = {
    notification: { date: 100, request: { identifier: "notification", content: { data: {
      recipient_user_id: "user", href: "/(logged-in)/notifications",
    } } } }, actionIdentifier: "default",
  };
  const state = { session: { user: { id: "user" } } };
  const useAuthStore = Object.assign((selector) => selector(state), { getState: () => state });
  const module = loadTS("components/push/PushNotificationNavigationListener.tsx", {
    react: { useRef: (value) => ({ current: value }), useEffect: (effect) => effect() },
    "react-native": { Platform: { OS: "ios" } },
    "expo-router": { useRouter: () => ({ push: (href) => routes.push(href) }) },
    "@/stores/authStore": { useAuthStore },
    "@/lib/navigation/notificationTarget": loadTS("lib/navigation/notificationTarget.ts"),
    "expo-notifications": {
      addNotificationResponseReceivedListener: (callback) => { listener = callback; return { remove() {} }; },
      getLastNotificationResponseAsync: async () => response,
      clearLastNotificationResponseAsync: async () => {},
    },
  });
  module.default();
  listener(response);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(routes, ["/(logged-in)/notifications"]);
  listener({ ...response, notification: { ...response.notification, date: 101, request: {
    identifier: "another", content: { data: { recipient_user_id: "other", href: "/(logged-in)/notifications" } },
  } } });
  assert.equal(routes.length, 1);
});
