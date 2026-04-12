import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { usePushNotificationPreferences } from "@/hooks/usePushNotificationPreferences";
import {
  getNotificationPermissionStatus,
  requestNotificationPermissionsAsync,
} from "@/lib/pushNotifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
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

export default function ManageNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { prefs, loading, updatePrefs } = usePushNotificationPreferences();

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
    }, [refreshPermission]),
  );

  const allEnabled =
    !!prefs?.remindersEnabled && !!prefs?.activitiesEnabled;

  const setAll = async (on: boolean) => {
    if (!prefs) return;
    await updatePrefs({
      remindersEnabled: on,
      activitiesEnabled: on,
    });
  };

  const setReminders = async (on: boolean) => {
    if (!prefs) return;
    await updatePrefs({ ...prefs, remindersEnabled: on });
  };

  const setActivities = async (on: boolean) => {
    if (!prefs) return;
    await updatePrefs({ ...prefs, activitiesEnabled: on });
  };

  const requestOsPermission = async () => {
    if (Platform.OS === "web") return;
    await requestNotificationPermissionsAsync();
    await refreshPermission();
  };

  const openSystemSettings = () => {
    void Linking.openSettings();
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
          Choose which alerts Crittr may send. Your device still controls sounds
          and banners. Reminders cover feeds, medications, vaccinations, and vet
          visits. Activities include co-care logs and nudges based on your daily
          progress.
        </Text>

        {Platform.OS !== "web" ? (
          <View style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>System permission</Text>
              <Text style={styles.cardSub}>{permissionLabel}</Text>
            </View>
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
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>In-app categories</Text>

        {loading || !prefs ? (
          <Text style={styles.loadingText}>Loading preferences…</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>All</Text>
                <Text style={styles.cardSub}>
                  Turn every Crittr notification type on or off
                </Text>
              </View>
              <Switch
                value={allEnabled}
                onValueChange={(v) => void setAll(v)}
                trackColor={{ false: Colors.gray200, true: Colors.orangeLight }}
                thumbColor={allEnabled ? Colors.orange : Colors.gray400}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Reminders</Text>
                <Text style={styles.cardSub}>
                  Feeding, medications, vaccinations, and vet visits
                </Text>
              </View>
              <Switch
                value={prefs.remindersEnabled}
                onValueChange={(v) => void setReminders(v)}
                trackColor={{ false: Colors.gray200, true: Colors.orangeLight }}
                thumbColor={
                  prefs.remindersEnabled ? Colors.orange : Colors.gray400
                }
              />
            </View>

            <View style={styles.card}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Activities</Text>
                <Text style={styles.cardSub}>
                  Co-care activity, daily logging nudges, and progress prompts
                </Text>
              </View>
              <Switch
                value={prefs.activitiesEnabled}
                onValueChange={(v) => void setActivities(v)}
                trackColor={{ false: Colors.gray200, true: Colors.orangeLight }}
                thumbColor={
                  prefs.activitiesEnabled ? Colors.orange : Colors.gray400
                }
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
  permissionActions: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
  },
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
