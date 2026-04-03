import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type PrefKey =
  | "coCareActivity"
  | "feedingSoon"
  | "medDue"
  | "vacDue"
  | "weeklyDigest";

const ROWS: { key: PrefKey; title: string; subtitle: string }[] = [
  {
    key: "coCareActivity",
    title: "Co-carer activity",
    subtitle: "Notify me when a co-carer adds an activity or note",
  },
  {
    key: "feedingSoon",
    title: "Feeding reminders",
    subtitle: "Remind me when it’s close to feeding time",
  },
  {
    key: "medDue",
    title: "Medication due",
    subtitle: "Alert when a dose is coming up or overdue",
  },
  {
    key: "vacDue",
    title: "Vaccination & vet dates",
    subtitle: "Reminders before boosters and scheduled visits",
  },
  {
    key: "weeklyDigest",
    title: "Weekly summary",
    subtitle: "A short recap of walks, meals, and health notes",
  },
];

export default function ManageNotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    coCareActivity: true,
    feedingSoon: true,
    medDue: false,
    vacDue: true,
    weeklyDigest: false,
  });

  const toggle = (key: PrefKey) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

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
          Notifications
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
          These preferences are for testing the Crittr Pro experience. They are
          not saved to the server yet.
        </Text>
        {ROWS.map((row) => (
          <View key={row.key} style={styles.card}>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{row.title}</Text>
              <Text style={styles.cardSub}>{row.subtitle}</Text>
            </View>
            <Switch
              value={prefs[row.key]}
              onValueChange={() => toggle(row.key)}
              trackColor={{ false: Colors.gray200, true: Colors.orangeLight }}
              thumbColor={prefs[row.key] ? Colors.orange : Colors.gray400}
            />
          </View>
        ))}
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
});
