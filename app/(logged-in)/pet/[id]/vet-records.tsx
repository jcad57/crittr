import HealthListCard from "@/components/ui/health/HealthListCard";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetDetailsQuery, usePetVetVisitsQuery } from "@/hooks/queries";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PetVetRecordsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: details, isLoading: loadingPet } = usePetDetailsQuery(id);
  const { data: visits, isLoading: loadingVisits } = usePetVetVisitsQuery(id);

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

  const rows = visits ?? [];
  const openAddVisit = () => {
    if (!id) return;
    router.push(`/(logged-in)/add-vet-visit?petId=${id}`);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Vet records
        </Text>
        <View style={styles.navSpacer} />
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
          Past and scheduled visits for {details.name}.
        </Text>

        <Pressable style={styles.addRow} onPress={openAddVisit}>
          <View style={styles.addIcon}>
            <MaterialCommunityIcons
              name="calendar-plus"
              size={22}
              color={Colors.orange}
            />
          </View>
          <Text style={styles.addText}>Schedule a vet visit</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>

        {loadingVisits ? (
          <ActivityIndicator
            style={styles.listSpinner}
            color={Colors.orange}
          />
        ) : rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No visits yet. Add one to keep a timeline here.
            </Text>
          </View>
        ) : (
          <HealthListCard>
            {rows.map((v, i) => {
              const now = Date.now();
              const t = new Date(v.visit_at).getTime();
              const upcoming = !Number.isNaN(t) && t >= now - 60_000;
              return (
                <View
                  key={v.id}
                  style={[styles.visitRow, i < rows.length - 1 && styles.rowBorder]}
                >
                  <View style={styles.iconBox}>
                    <MaterialCommunityIcons
                      name="stethoscope"
                      size={20}
                      color={Colors.lavenderDark}
                    />
                  </View>
                  <View style={styles.mid}>
                    <Text style={styles.visitTitle} numberOfLines={2}>
                      {v.title}
                    </Text>
                    <Text style={styles.visitSub} numberOfLines={2}>
                      {formatWhen(v.visit_at)}
                      {upcoming ? " · Upcoming" : ""}
                    </Text>
                    {v.notes?.trim() ? (
                      <Text style={styles.notes} numberOfLines={4}>
                        {v.notes.trim()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </HealthListCard>
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
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    minWidth: 72,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { minWidth: 72 },
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
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  listSpinner: { marginVertical: 12 },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  visitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  mid: { flex: 1, minWidth: 0, gap: 4 },
  visitTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  visitSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },
  notes: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
});
