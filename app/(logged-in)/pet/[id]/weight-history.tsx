import PetProfileNavBar from "@/components/petScreens/petProfile/PetProfileNavBar";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetWeightLineChart from "@/components/ui/health/PetWeightLineChart";
import WeightRangeSelector from "@/components/ui/health/WeightRangeSelector";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  usePetDetailsQuery,
  usePetWeightEntriesQuery,
} from "@/hooks/queries";
import { useDeletePetWeightEntryMutation } from "@/hooks/mutations/useManageActivityMutation";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  entriesToChartPoints,
  formatChartDateLabel,
  formatWeightDelta,
  pointsForRange,
  preferredUnit,
  type WeightChartPoint,
  type WeightHistoryRange,
} from "@/utils/petWeightHistory";

const SCALE_ICON = require("@/assets/icons/weight-scale-icon.png");

export default function WeightHistoryScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { router, push } = useNavigationCooldown();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details } = usePetDetailsQuery(petId ?? null);
  const {
    data: entries = [],
    isLoading,
    isError,
    error,
  } = usePetWeightEntriesQuery(petId ?? null);

  const [range, setRange] = useState<WeightHistoryRange>("3M");

  const unit = useMemo(
    () => preferredUnit(entries, details?.weight_unit ?? null),
    [entries, details?.weight_unit],
  );

  const allPoints = useMemo<WeightChartPoint[]>(
    () => entriesToChartPoints(entries, unit),
    [entries, unit],
  );

  const points = useMemo(() => pointsForRange(allPoints, range), [allPoints, range]);

  const stats = useMemo(() => {
    if (points.length === 0) return null;
    const last = points[points.length - 1];
    const first = points[0];
    const delta = formatWeightDelta(last.value, first.value, unit);
    const max = points.reduce(
      (m, p) => (p.value > m ? p.value : m),
      Number.NEGATIVE_INFINITY,
    );
    const min = points.reduce(
      (m, p) => (p.value < m ? p.value : m),
      Number.POSITIVE_INFINITY,
    );
    return {
      latestValue: last.value,
      latestDate: formatChartDateLabel(last.ts, true),
      delta,
      max,
      min,
    };
  }, [points, unit]);

  const handleAddWeighIn = useCallback(() => {
    push("/(logged-in)/add-activity" as Href);
  }, [push]);

  const deleteEntryMut = useDeletePetWeightEntryMutation(petId ?? null);

  const confirmDeleteEntry = useCallback(
    (entryId: string, dateLabel: string) => {
      Alert.alert(
        "Delete weigh-in?",
        `${dateLabel}: this entry will be removed from the chart and the activity feed. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              deleteEntryMut.mutate(entryId, {
                onError: (err) => {
                  Alert.alert(
                    "Couldn't delete weigh-in",
                    err instanceof Error ? err.message : "Please try again.",
                  );
                },
              });
            },
          },
        ],
      );
    },
    [deleteEntryMut],
  );

  const petName = details?.name?.trim() || "Pet";

  if (!petId) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <PetProfileNavBar
        title={`${petName}'s weight`}
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Image
              source={SCALE_ICON}
              style={styles.heroIconImg}
              tintColor={Colors.skyDark}
              contentFit="contain"
            />
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroLabel}>Latest weight</Text>
            {stats ? (
              <>
                <Text style={styles.heroValue}>
                  {stats.latestValue}
                  <Text style={styles.heroUnit}> {unit}</Text>
                </Text>
                <Text style={styles.heroDate}>{stats.latestDate}</Text>
              </>
            ) : (
              <>
                <Text style={styles.heroValue}>—</Text>
                <Text style={styles.heroDate}>No weigh-ins logged yet.</Text>
              </>
            )}
          </View>
          {stats ? (
            <View
              style={[
                styles.deltaPill,
                stats.delta.sign === "up" && styles.deltaPillUp,
                stats.delta.sign === "down" && styles.deltaPillDown,
                stats.delta.sign === "flat" && styles.deltaPillFlat,
              ]}
            >
              <Text style={styles.deltaText}>{stats.delta.label}</Text>
            </View>
          ) : null}
        </View>

        <WeightRangeSelector active={range} onChange={setRange} />

        {isLoading ? (
          <View style={styles.centeredBlock}>
            <ActivityIndicator size="large" color={Colors.orange} />
          </View>
        ) : isError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Couldn't load weight history</Text>
            <Text style={styles.emptyHint}>
              {error?.message ?? "Please try again."}
            </Text>
          </View>
        ) : points.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {entries.length === 0
                ? "No weigh-ins yet"
                : "No weigh-ins in this range"}
            </Text>
            <Text style={styles.emptyHint}>
              {entries.length === 0
                ? `Log ${petName}'s first weigh-in to start tracking changes over time.`
                : "Try a longer range or log a new weigh-in."}
            </Text>
          </View>
        ) : points.length === 1 ? (
          /** A single point can't draw a line — the gifted-charts area path
           *  for one point is degenerate, so show a stat card instead. */
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>One weigh-in in this range</Text>
            <Text style={styles.emptyHint}>
              Log another weigh-in to start seeing a trend line.
            </Text>
          </View>
        ) : (
          <PetWeightLineChart points={points} unitLabel={unit} />
        )}

        {stats && points.length > 1 ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>High</Text>
              <Text style={styles.summaryValue}>
                {stats.max} {unit}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Low</Text>
              <Text style={styles.summaryValue}>
                {stats.min} {unit}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Entries</Text>
              <Text style={styles.summaryValue}>{points.length}</Text>
            </View>
          </View>
        ) : null}

        <OrangeButton onPress={handleAddWeighIn} style={styles.cta}>
          Log new weigh-in
        </OrangeButton>

        {entries.length > 0 ? (
          <View style={styles.listSection}>
            <Text style={styles.sectionLabel}>All weigh-ins</Text>
            <View style={styles.listCard}>
              {[...entries]
                .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
                .map((e, i, arr) => {
                  const localTs = (() => {
                    const d = new Date(`${e.recorded_at}T12:00:00`);
                    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
                  })();
                  const valueInDisplayUnit = (() => {
                    const v = Number(e.weight_lbs);
                    if (!Number.isFinite(v)) return null;
                    if (e.weight_unit === unit) return v;
                    if (unit === "kg" && e.weight_unit === "lbs") {
                      return Math.round(v * 0.45359237 * 100) / 100;
                    }
                    if (unit === "lbs" && e.weight_unit === "kg") {
                      return Math.round((v / 0.45359237) * 100) / 100;
                    }
                    return v;
                  })();
                  const dateLabel = formatChartDateLabel(localTs, true);
                  const isDeletingThis =
                    deleteEntryMut.isPending &&
                    deleteEntryMut.variables === e.id;
                  return (
                    <View
                      key={e.id}
                      style={[
                        styles.listRow,
                        i < arr.length - 1 && styles.listRowDivider,
                      ]}
                    >
                      <Text style={styles.listDate}>{dateLabel}</Text>
                      <View style={styles.listRowRight}>
                        <Text style={styles.listValue}>
                          {valueInDisplayUnit ?? "—"} {unit}
                        </Text>
                        <Pressable
                          onPress={() => confirmDeleteEntry(e.id, dateLabel)}
                          disabled={deleteEntryMut.isPending}
                          hitSlop={8}
                          style={({ pressed }) => [
                            styles.deleteBtn,
                            pressed && styles.deleteBtnPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete weigh-in on ${dateLabel}`}
                        >
                          {isDeletingThis ? (
                            <ActivityIndicator
                              size="small"
                              color={Colors.error}
                            />
                          ) : (
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={20}
                              color={Colors.error}
                            />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 4,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.sky,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconImg: {
    width: 32,
    height: 32,
  },
  heroBody: {
    flex: 1,
    minWidth: 0,
  },
  heroLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  heroValue: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.textPrimary,
  },
  heroUnit: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  heroDate: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    marginTop: 2,
  },
  deltaPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    backgroundColor: Colors.gray100,
  },
  deltaPillUp: {
    backgroundColor: Colors.errorLight,
  },
  deltaPillDown: {
    backgroundColor: Colors.successLight,
  },
  deltaPillFlat: {
    backgroundColor: Colors.gray100,
  },
  deltaText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  centeredBlock: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  emptyHint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: Colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  summaryValue: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  cta: {
    marginTop: 4,
  },
  listSection: {
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  listRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  listRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listDate: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listValue: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnPressed: {
    backgroundColor: Colors.errorLight,
  },
});
