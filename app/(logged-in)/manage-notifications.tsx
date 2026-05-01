import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { usePushNotificationPreferences } from "@/hooks/usePushNotificationPreferences";
import {
  getNotificationPermissionStatus,
  requestNotificationPermissionsAsync,
} from "@/lib/pushNotifications";
import { syncExpoPushTokenToSupabase } from "@/services/pushTokens";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
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
  const { prefs, loading, updatePrefs, flushPending } =
    usePushNotificationPreferences();

  const [permStatus, setPermStatus] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED,
  );

  const refreshPermission = useCallback(async () => {
    if (Platform.OS === "web") return;
    const s = await getNotificationPermissionStatus();
    setPermStatus(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
      if (!userId || Platform.OS === "web") return;
      void getNotificationPermissionStatus().then((s) => {
        if (s === Notifications.PermissionStatus.GRANTED) {
          void syncExpoPushTokenToSupabase(userId);
        }
      });

      return () => {
        void flushPending();
      };
    }, [flushPending, refreshPermission, userId]),
  );

  const allEnabled =
    prefs.notify_meals_treats &&
    prefs.notify_co_care_activities &&
    prefs.notify_medications &&
    prefs.notify_vet_visits;

  const setAll = (on: boolean) => {
    void updatePrefs({
      notify_meals_treats: on,
      notify_co_care_activities: on,
      notify_medications: on,
      notify_vet_visits: on,
    });
  };

  const requestOsPermission = async () => {
    if (Platform.OS === "web") return;
    await requestNotificationPermissionsAsync();
    await refreshPermission();
    if (userId) void syncExpoPushTokenToSupabase(userId);
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
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Push notifications
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Choose which reminders Crittr may schedule on this device.
        </Text>

        {Platform.OS !== "web" ? (
          <View style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>System permission</Text>
              <Text style={styles.cardSub}>{permissionLabel}</Text>
            </View>
            <View style={styles.permissionRowRight}>
              <View style={styles.permissionActions}>
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
                  Daily alerts from each scheduled portion time (treats without
                  times use an evening reminder)
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
                <Text style={styles.cardTitle}>Co-care activities</Text>
                <Text style={styles.cardSub}>
                  Push when a co-carer logs food, potty, exercise, and more—and a
                  daily nudge if exercise goals aren&apos;t met
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
                  Heads-up shortly before each medication’s reminder time
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
                  Upcoming visits from your pet’s health calendar
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
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { width: 28 },
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
  leadEm: {
    fontFamily: Font.uiSemiBold,
    color: Colors.textPrimary,
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
