import ScreenHeader from "@/components/ui/ScreenHeader";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { usePushNotificationPreferences } from "@/hooks/usePushNotificationPreferences";
import {
  getNotificationPermissionStatus,
  requestNotificationPermissionsAsync,
} from "@/lib/pushNotifications";
import { syncExpoPushTokenToSupabase } from "@/services/pushTokens";
import { getReminderScheduleStatus, subscribeReminderScheduleStatus, syncCrittrReminderNotifications } from "@/services/reminderNotificationSchedule";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Matches native two-state UISwitch styling: saturated “on”, neutral “off”—no pastel track that reads as disabled. */
const NOTIF_SWITCH_TRACK = {
  false: Colors.gray200,
  true: Colors.orange,
} as const;

const NOTIF_SWITCH_IOS_BG =
  Platform.OS === "ios" ? { ios_backgroundColor: Colors.gray200 } : {};

/** White knob on fills—reads clearly on/off; avoids pastel track + tinted thumb blending as “disabled”. */
const NOTIF_SWITCH_THUMB = Colors.white;

export default function ManageNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { prefs, loading, updatePrefs, flushPending, saveError } =
    usePushNotificationPreferences();

  const [permStatus, setPermStatus] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED,
  );
  const [setupError, setSetupError] = useState<string | null>(null);
  const reminderStatus = useSyncExternalStore(subscribeReminderScheduleStatus, getReminderScheduleStatus, () => null);
  const currentReminderStatus = reminderStatus?.userId === userId ? reminderStatus : null;

  const refreshPermission = useCallback(async () => {
    if (Platform.OS === "web") return;
    const s = await getNotificationPermissionStatus();
    setPermStatus(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission().catch((error) => console.warn("[notifications] permission", error));
      if (!userId || Platform.OS === "web") return;
      void getNotificationPermissionStatus().then((s) => {
        if (s === Notifications.PermissionStatus.GRANTED) {
          void syncExpoPushTokenToSupabase(userId)
            .then(() => setSetupError(null))
            .catch(() => setSetupError("Remote push registration couldn't finish. Tap Refresh setup to retry."));
        }
      }).catch((error) => console.warn("[notifications] permission", error));

      return () => {
        void flushPending();
      };
    }, [flushPending, refreshPermission, userId]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPermission().catch(() => {});
    });
    return () => sub.remove();
  }, [refreshPermission]);

  const allEnabled =
    prefs.notify_meals_treats &&
    prefs.notify_co_care_activities &&
    prefs.notify_medications &&
    prefs.notify_vet_visits &&
    prefs.notify_vaccinations;

  const setAll = (on: boolean) => {
    void updatePrefs({
      notify_meals_treats: on,
      notify_co_care_activities: on,
      notify_medications: on,
      notify_vet_visits: on,
      notify_vaccinations: on,
    });
  };

  const requestOsPermission = async () => {
    if (Platform.OS === "web") return;
    try {
      await requestNotificationPermissionsAsync();
      await refreshPermission();
      if (userId) {
        await syncCrittrReminderNotifications(userId, prefs);
        await syncExpoPushTokenToSupabase(userId);
        setSetupError(null);
      }
    } catch {
      Alert.alert("Couldn't finish notification setup", "Check your connection and try again. You can also enable notifications in system settings.");
    }
  };

  const openSystemSettings = () => {
    void Linking.openSettings();
  };

  const showSystemNotificationHelp = () => {
    const title = "Turn off notifications in system settings";
    const message =
      Platform.OS === "ios"
        ? "To stop Crittr from sending alerts entirely, open the Settings app, scroll to Crittr, tap Notifications, then turn off Allow Notifications.\n\nYou can also open Settings → Notifications → Crittr and disable alerts there."
        : "To stop Crittr from sending alerts entirely, open Settings, then Apps (or Notifications). Tap Crittr, open Notifications, and turn off all notification categories or the main toggle.\n\nExact steps vary slightly by device (Samsung, Pixel, etc.) but Crittr’s app settings screen always includes a Notifications section.";

    Alert.alert(title, message, [{ text: "OK" }]);
  };

  const permissionLabel =
    Platform.OS === "web"
      ? "Not available on web"
      : permStatus === Notifications.PermissionStatus.GRANTED
        ? "Allowed"
        : permStatus === Notifications.PermissionStatus.DENIED
          ? "Blocked in system settings"
          : "Not yet allowed";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader
        title="Push notifications"
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Choose care reminders and shared-care updates. Each pet&apos;s reminders
          follow their owner&apos;s saved care time zone.
        </Text>

        {Platform.OS !== "web" ? (
          <View style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>System permission</Text>
              <Text style={styles.cardSub}>{permissionLabel}</Text>
              {setupError ? <Text style={styles.cardSub}>{setupError}</Text> : null}
              {currentReminderStatus?.error ? <Text style={styles.cardSub}>{currentReminderStatus.error}</Text> : null}
              {currentReminderStatus?.timeZone ? (
                <Text style={styles.cardSub}>Your care time zone: {currentReminderStatus.timeZone}</Text>
              ) : null}
              {currentReminderStatus && currentReminderStatus.missingOwnerTimeZones > 0 ? (
                <Text style={styles.cardSub}>
                  A shared pet&apos;s owner needs to open the updated app to finish
                  setting up their care time zone.
                </Text>
              ) : null}
            </View>
            <View style={styles.permissionRowRight}>
              <View style={styles.permissionActions}>
                {permStatus === Notifications.PermissionStatus.GRANTED ? (
                  <Pressable onPress={requestOsPermission} accessibilityRole="button">
                    <Text style={styles.textBtnLabel}>Refresh setup</Text>
                  </Pressable>
                ) : null}
                {permStatus !== Notifications.PermissionStatus.GRANTED ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.textBtn,
                      pressed && styles.textBtnPressed,
                    ]}
                    onPress={requestOsPermission}
                  >
                    <Text style={styles.textBtnLabel}>Allow</Text>
                  </Pressable>
                ) : null}
                {permStatus === Notifications.PermissionStatus.DENIED ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.textBtn,
                      pressed && styles.textBtnPressed,
                    ]}
                    onPress={openSystemSettings}
                  >
                    <Text style={styles.textBtnLabel}>Open settings</Text>
                  </Pressable>
                ) : null}
              </View>
              <Pressable
                onPress={showSystemNotificationHelp}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.permissionInfoBtn,
                  pressed && styles.permissionInfoBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="How to turn off notifications in system settings"
              >
                <MaterialCommunityIcons
                  name="information-outline"
                  size={22}
                  color={Colors.gray500}
                />
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Reminders & activity</Text>
        {saveError ? (
          <Pressable onPress={() => void flushPending()} accessibilityRole="button">
            <Text style={styles.cardSub}>{saveError} Tap to retry.</Text>
          </Pressable>
        ) : null}

        {loading ? (
          <Text style={styles.loadingText}>Loading preferences…</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>All</Text>
                <Text style={styles.cardSub}>
                  Turn every notification category on or off
                </Text>
              </View>
              <Switch
                value={allEnabled}
                onValueChange={(v) => void setAll(v)}
                trackColor={NOTIF_SWITCH_TRACK}
                thumbColor={NOTIF_SWITCH_THUMB}
                {...NOTIF_SWITCH_IOS_BG}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Meals & treats</Text>
                <Text style={styles.cardSub}>
                  A reminder at each meal and treat time in your pet&apos;s schedule
                </Text>
              </View>
              <Switch
                value={prefs.notify_meals_treats}
                onValueChange={(v) =>
                  void updatePrefs({ notify_meals_treats: v })
                }
                trackColor={NOTIF_SWITCH_TRACK}
                thumbColor={NOTIF_SWITCH_THUMB}
                {...NOTIF_SWITCH_IOS_BG}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Exercise & co-care activities</Text>
                <Text style={styles.cardSub}>
                  Reminders at scheduled exercise times, plus updates about who
                  completed a shared pet&apos;s care tasks
                </Text>
              </View>
              <Switch
                value={prefs.notify_co_care_activities}
                onValueChange={(v) =>
                  void updatePrefs({ notify_co_care_activities: v })
                }
                trackColor={NOTIF_SWITCH_TRACK}
                thumbColor={NOTIF_SWITCH_THUMB}
                {...NOTIF_SWITCH_IOS_BG}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Medications</Text>
                <Text style={styles.cardSub}>
                  A reminder at each scheduled medication time
                </Text>
              </View>
              <Switch
                value={prefs.notify_medications}
                onValueChange={(v) =>
                  void updatePrefs({ notify_medications: v })
                }
                trackColor={NOTIF_SWITCH_TRACK}
                thumbColor={NOTIF_SWITCH_THUMB}
                {...NOTIF_SWITCH_IOS_BG}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Vet visits</Text>
                <Text style={styles.cardSub}>
                  Reminders 24 hours and 1 hour before each vet visit
                </Text>
              </View>
              <Switch
                value={prefs.notify_vet_visits}
                onValueChange={(v) =>
                  void updatePrefs({ notify_vet_visits: v })
                }
                trackColor={NOTIF_SWITCH_TRACK}
                thumbColor={NOTIF_SWITCH_THUMB}
                {...NOTIF_SWITCH_IOS_BG}
              />
            </View>
            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Vaccinations</Text>
                <Text style={styles.cardSub}>
                  Reminders at 9 AM in the owner&apos;s care time zone one week before a vaccine expires
                  and on its expiration date
                </Text>
              </View>
              <Switch
                value={prefs.notify_vaccinations}
                onValueChange={(v) => void updatePrefs({ notify_vaccinations: v })}
                trackColor={NOTIF_SWITCH_TRACK}
                thumbColor={NOTIF_SWITCH_THUMB}
                {...NOTIF_SWITCH_IOS_BG}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 12,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginTop: 4,
  },
  loadingText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  permissionRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  permissionActions: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
  permissionInfoBtn: {
    padding: 6,
    marginLeft: 2,
  },
  permissionInfoBtnPressed: { opacity: 0.65 },
  textBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.orangeLight,
  },
  textBtnPressed: { opacity: 0.88 },
  textBtnLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
});
