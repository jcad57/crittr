import HealthListCard from "@/components/ui/health/HealthListCard";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import HealthSectionHeader from "@/components/ui/health/HealthSectionHeader";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { getMockMedicalLibrary } from "@/data/medicalRecordsMock";
import { usePetDetailsQuery } from "@/hooks/queries";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function vetKindIcon(kind: "visit" | "lab" | "vaccination") {
  switch (kind) {
    case "lab":
      return "flask-outline" as const;
    case "vaccination":
      return "needle" as const;
    default:
      return "stethoscope" as const;
  }
}

export default function PetMedicalRecordsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: details, isLoading: loadingPet } = usePetDetailsQuery(id);

  const { vetRecords, uploads } = useMemo(() => {
    if (!id || !details) {
      return { vetRecords: [], uploads: [] };
    }
    return getMockMedicalLibrary(id, details.name);
  }, [id, details]);

  if (loadingPet) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!details) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Pet not found.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Medical Records
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Medical records for"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Visit notes, labs, and files you&apos;ve saved for {details.name}.
          Schedule new visits from Health → Upcoming visits.
        </Text>

        <HealthSectionHeader title="FROM YOUR VET" />
        <HealthListCard>
          {vetRecords.map((r, i) => (
            <Pressable
              key={r.id}
              style={[styles.row, i < vetRecords.length - 1 && styles.rowBorder]}
              onPress={() => {}}
            >
              <View style={styles.iconBox}>
                <MaterialCommunityIcons
                  name={vetKindIcon(r.kind)}
                  size={20}
                  color={Colors.lavenderDark}
                />
              </View>
              <View style={styles.mid}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {r.title}
                </Text>
                <Text style={styles.rowMeta}>{r.dateLabel}</Text>
                <Text style={styles.rowSummary} numberOfLines={3}>
                  {r.summary}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.gray400}
              />
            </Pressable>
          ))}
        </HealthListCard>

        <HealthSectionHeader title="YOUR UPLOADS" />
        <HealthListCard>
          {uploads.map((u, i) => (
            <Pressable
              key={u.id}
              style={[styles.row, i < uploads.length - 1 && styles.rowBorder]}
              onPress={() => {}}
            >
              <View
                style={[
                  styles.iconBox,
                  u.fileKind === "pdf" && styles.iconBoxPdf,
                ]}
              >
                <MaterialCommunityIcons
                  name={u.fileKind === "pdf" ? "file-pdf-box" : "image-outline"}
                  size={22}
                  color={u.fileKind === "pdf" ? Colors.orange : Colors.skyDark}
                />
              </View>
              <View style={styles.mid}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {u.fileName}
                </Text>
                <Text style={styles.rowMeta}>{u.uploadedLabel}</Text>
                <Text style={styles.rowSummary} numberOfLines={1}>
                  {u.detail}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={Colors.gray400}
              />
            </Pressable>
          ))}
        </HealthListCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
    paddingHorizontal: 24,
  },
  notFound: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lavenderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxPdf: {
    backgroundColor: Colors.orangeLight,
  },
  mid: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
  rowSummary: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
