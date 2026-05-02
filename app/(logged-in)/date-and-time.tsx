import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { profileQueryKey, useProfileQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { queryClient } from "@/lib/queryClient";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import type {
  UserDateDisplay,
  UserTimeDisplay,
} from "@/utils/userDateTimeFormat";
import { dateDisplayFromProfile, timeDisplayFromProfile } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TIME_OPTIONS: { id: UserTimeDisplay; label: string }[] = [
  { id: "12h", label: "12-hour (AM/PM)" },
  { id: "24h", label: "24-hour" },
];

const DATE_OPTIONS: { id: UserDateDisplay; label: string }[] = [
  { id: "mdy", label: "MM/DD/YYYY" },
  { id: "dmy", label: "DD/MM/YYYY" },
];

export default function DateAndTimeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollBottom = useFloatingNavScrollInset();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const userId = session?.user?.id;

  const { data: profile, isFetching } = useProfileQuery();
  const timeSel = timeDisplayFromProfile(profile);
  const dateSel = dateDisplayFromProfile(profile);

  const [busyKey, setBusyKey] = useState<null | "time" | "date">(null);
  const [openPicker, setOpenPicker] = useState<null | "time" | "date">(null);

  const persistFormat = useCallback(
    async (patch: {
      time_display_format?: UserTimeDisplay;
      date_display_format?: UserDateDisplay;
    }) => {
      if (!userId) return;
      setBusyKey(
        patch.time_display_format != null ? "time" : patch.date_display_format != null ? "date" : null,
      );
      try {
        const updated = await updateProfile(userId, patch);
        if (updated) {
          setProfile(updated);
          await queryClient.invalidateQueries({
            queryKey: profileQueryKey(userId),
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert("Could not save", msg);
      } finally {
        setBusyKey(null);
        setOpenPicker(null);
      }
    },
    [userId, setProfile],
  );

  const pickTimeDescription =
    TIME_OPTIONS.find((o) => o.id === timeSel)?.label ?? "—";
  const pickDateDescription =
    DATE_OPTIONS.find((o) => o.id === dateSel)?.label ?? "—";

  const activeOptions = openPicker === "time" ? TIME_OPTIONS : openPicker === "date" ? DATE_OPTIONS : [];

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
        <Text style={styles.title} numberOfLines={1}>
          Date and Time
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHint}>
          Dates and clocks in Crittr follow your choices below. Stored events still
          use your device’s timezone.
        </Text>

        <Text style={styles.sectionLabel}>Formatting</Text>

        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => setOpenPicker("time")}
          disabled={busyKey !== null || isFetching}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Time</Text>
            <Text style={styles.rowSub}>{pickTimeDescription}</Text>
          </View>
          <View style={styles.rowTrail}>
            {busyKey === "time" ? (
              <ActivityIndicator size="small" color={Colors.orange} />
            ) : (
              <MaterialCommunityIcons
                name="chevron-down"
                size={22}
                color={Colors.gray400}
              />
            )}
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.row,
            styles.rowGap,
            pressed && styles.rowPressed,
          ]}
          onPress={() => setOpenPicker("date")}
          disabled={busyKey !== null || isFetching}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Date</Text>
            <Text style={styles.rowSub}>{pickDateDescription}</Text>
          </View>
          <View style={styles.rowTrail}>
            {busyKey === "date" ? (
              <ActivityIndicator size="small" color={Colors.orange} />
            ) : (
              <MaterialCommunityIcons
                name="chevron-down"
                size={22}
                color={Colors.gray400}
              />
            )}
          </View>
        </Pressable>
      </ScrollView>

      <Modal
        visible={openPicker !== null && activeOptions.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => busyKey === null && setOpenPicker(null)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => busyKey === null && setOpenPicker(null)}
            disabled={busyKey !== null}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>
              {openPicker === "time" ? "Time format" : "Date format"}
            </Text>
            {activeOptions.map((opt) => {
              const picked =
                openPicker === "time"
                  ? timeSel === opt.id
                  : dateSel === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    styles.optionRow,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => {
                    if (openPicker === "time") {
                      void persistFormat({
                        time_display_format: opt.id as UserTimeDisplay,
                      });
                    } else if (openPicker === "date") {
                      void persistFormat({
                        date_display_format: opt.id as UserDateDisplay,
                      });
                    }
                  }}
                  disabled={busyKey !== null}
                >
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  {picked ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={22}
                      color={Colors.orange}
                    />
                  ) : (
                    <View style={styles.checkSpacer} />
                  )}
                </Pressable>
              );
            })}
            <Pressable
              style={styles.cancelSheet}
              onPress={() => busyKey === null && setOpenPicker(null)}
              disabled={busyKey !== null}
            >
              <Text style={styles.cancelSheetText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  title: {
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
    paddingTop: 8,
  },
  sectionHint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  rowGap: { marginTop: 10 },
  rowPressed: { opacity: 0.92 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  rowTrail: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalBackdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
  },
  sheetTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.black,
    marginBottom: 8,
    textAlign: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
  },
  optionLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  checkSpacer: {
    width: 22,
    height: 22,
  },
  cancelSheet: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 4,
  },
  cancelSheetText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
