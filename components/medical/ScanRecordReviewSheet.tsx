import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type {
  ExtractedMedication,
  ExtractedVaccination,
  ParseMedicalRecordResult,
} from "@/services/medicalRecordParser";
import type {
  ScanMedicationDecision,
  ScanVaccinationDecision,
} from "@/hooks/mutations/useMedicalRecordScanMutations";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHEET_HEIGHT_RATIO = 0.9;

/** Per-row local state — starts from the server response and is mutated by the user's toggles. */
type MedRowState = {
  extracted: ExtractedMedication;
  /** skip | insert | update; default = "insert" for new, "update" when server flagged a duplicate. */
  mode: "skip" | "insert" | "update";
};

type VacRowState = {
  extracted: ExtractedVaccination;
  mode: "skip" | "insert" | "update";
};

type Props = {
  visible: boolean;
  /** Extraction result from the edge function. Null-safe while nothing has been scanned yet. */
  result: ParseMedicalRecordResult | null;
  petName: string | null;
  onCancel: () => void;
  onConfirm: (payload: {
    medications: ScanMedicationDecision[];
    vaccinations: ScanVaccinationDecision[];
  }) => void;
  isApplying: boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function medScheduleLabel(m: ExtractedMedication): string {
  if (m.doses_per_period && m.dose_period) {
    return `${m.doses_per_period}× per ${m.dose_period}`;
  }
  if (m.interval_count && m.interval_unit) {
    const unit =
      m.interval_count === 1 ? m.interval_unit : `${m.interval_unit}s`;
    return `Every ${m.interval_count} ${unit}`;
  }
  return m.frequency?.trim() || "Schedule not specified";
}

function confidenceChip(
  confidence: "low" | "medium" | "high",
): { label: string; color: string; bg: string } {
  if (confidence === "high")
    return {
      label: "High",
      color: Colors.successDark,
      bg: Colors.successLight,
    };
  if (confidence === "low")
    return { label: "Low", color: Colors.error, bg: Colors.errorLight };
  return { label: "Medium", color: Colors.textSecondary, bg: Colors.gray100 };
}

function ModeToggle({
  value,
  onChange,
  hasExisting,
  disabled,
}: {
  value: "skip" | "insert" | "update";
  onChange: (next: "skip" | "insert" | "update") => void;
  hasExisting: boolean;
  disabled?: boolean;
}) {
  const addMode: "insert" | "update" = hasExisting ? "update" : "insert";
  const isAdd = value === addMode;
  const toggleAdd = () => onChange(isAdd ? "skip" : addMode);
  return (
    <View style={styles.modeRow}>
      <Pressable
        onPress={toggleAdd}
        disabled={disabled}
        style={[
          styles.modeBtn,
          isAdd ? styles.modeBtnActive : styles.modeBtnInactive,
        ]}
      >
        <MaterialCommunityIcons
          name={isAdd ? "check-circle" : "circle-outline"}
          size={18}
          color={isAdd ? Colors.white : Colors.textSecondary}
        />
        <Text
          style={[
            styles.modeBtnText,
            isAdd ? styles.modeBtnTextActive : styles.modeBtnTextInactive,
          ]}
        >
          {hasExisting ? "Update existing" : "Add to Crittr"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function ScanRecordReviewSheet({
  visible,
  result,
  petName,
  onCancel,
  onConfirm,
  isApplying,
}: Props) {
  const insets = useSafeAreaInsets();
  const sheetMaxHeight = Math.round(
    Dimensions.get("window").height * SHEET_HEIGHT_RATIO,
  );

  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(sheetMaxHeight)).current;
  const wasShownRef = useRef(false);

  const [meds, setMeds] = useState<MedRowState[]>([]);
  const [vacs, setVacs] = useState<VacRowState[]>([]);

  /** Rehydrate decisions whenever a new extraction result arrives. Defaults favour the user:
   *  dedup matches default to "update existing" (safer), new items to "insert". */
  useEffect(() => {
    if (!result) return;
    setMeds(
      result.medications.map((m) => ({
        extracted: m,
        mode: m.duplicate_of_id ? "update" : "insert",
      })),
    );
    setVacs(
      result.vaccinations.map((v) => ({
        extracted: v,
        mode: v.duplicate_of_id ? "update" : "insert",
      })),
    );
  }, [result]);

  useEffect(() => {
    if (visible) {
      wasShownRef.current = true;
      setMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(sheetMaxHeight);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!wasShownRef.current) return;
    wasShownRef.current = false;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: sheetMaxHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, backdropOpacity, sheetTranslateY, sheetMaxHeight]);

  const selectedCount = useMemo(() => {
    const m = meds.filter((x) => x.mode !== "skip").length;
    const v = vacs.filter((x) => x.mode !== "skip").length;
    return m + v;
  }, [meds, vacs]);

  const petNameMismatch =
    result?.pet_name_detected &&
    petName &&
    result.pet_name_detected.trim().toLowerCase() !==
      petName.trim().toLowerCase();

  const handleConfirm = () => {
    onConfirm({
      medications: meds.map((m) => ({
        mode: m.mode,
        existingId: m.extracted.duplicate_of_id,
        extracted: m.extracted,
      })),
      vaccinations: vacs.map((v) => ({
        mode: v.mode,
        existingId: v.extracted.duplicate_of_id,
        extracted: v.extracted,
      })),
    });
  };

  const totalFound = (result?.medications.length ?? 0) +
    (result?.vaccinations.length ?? 0);
  const nothingFound = result != null && totalFound === 0;

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.dim, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={isApplying ? undefined : onCancel}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: sheetMaxHeight,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Review extracted items</Text>
            <Text style={styles.sub}>
              Crittr AI read the document. Uncheck anything you don’t want
              saved. You can still edit each entry later.
            </Text>
          </View>

          {petNameMismatch ? (
            <View style={styles.warnCard}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={18}
                color={Colors.error}
              />
              <Text style={styles.warnText}>
                Document mentions “{result?.pet_name_detected}” but you’re
                reviewing this for {petName}. Double-check before saving.
              </Text>
            </View>
          ) : null}

          {(result?.warnings?.length ?? 0) > 0 ? (
            <View style={styles.warnCard}>
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.warnText}>
                {result!.warnings.length === 1
                  ? `1 file was skipped: ${result!.warnings[0].reason}`
                  : `${result!.warnings.length} files were skipped during scanning.`}
              </Text>
            </View>
          ) : null}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {nothingFound ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="magnify-close"
                  size={28}
                  color={Colors.gray400}
                />
                <Text style={styles.emptyTitle}>
                  No medications or vaccinations detected
                </Text>
                <Text style={styles.emptyBody}>
                  The document might be an invoice, lab report, or image that
                  doesn’t contain medication or vaccine details.
                </Text>
              </View>
            ) : null}

            {meds.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Medications ({meds.length})
                </Text>
                {meds.map((row, idx) => {
                  const chip = confidenceChip(row.extracted.confidence);
                  const hasExisting = Boolean(row.extracted.duplicate_of_id);
                  return (
                    <View key={`med-${idx}`} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>
                          {row.extracted.name}
                        </Text>
                        <View
                          style={[styles.confChip, { backgroundColor: chip.bg }]}
                        >
                          <Text
                            style={[styles.confChipText, { color: chip.color }]}
                          >
                            {chip.label}
                          </Text>
                        </View>
                      </View>
                      {hasExisting ? (
                        <View style={styles.dupRow}>
                          <MaterialCommunityIcons
                            name="link-variant"
                            size={14}
                            color={Colors.orange}
                          />
                          <Text style={styles.dupText}>
                            Already tracked — defaulting to update existing.
                          </Text>
                        </View>
                      ) : null}
                      <Text style={styles.itemMeta}>
                        {row.extracted.dosage?.trim() || "Dose not specified"} ·
                        {" "}
                        {medScheduleLabel(row.extracted)}
                      </Text>
                      {row.extracted.condition ? (
                        <Text style={styles.itemMetaMuted}>
                          For: {row.extracted.condition}
                        </Text>
                      ) : null}
                      <View style={styles.datesRow}>
                        <Text style={styles.itemMetaMuted}>
                          Last given: {formatDate(row.extracted.last_given_on)}
                        </Text>
                        <Text style={styles.itemMetaMuted}>
                          Next due: {formatDate(row.extracted.next_due_date)}
                        </Text>
                      </View>
                      {row.extracted.notes ? (
                        <Text style={styles.itemNotes} numberOfLines={3}>
                          {row.extracted.notes}
                        </Text>
                      ) : null}
                      <ModeToggle
                        value={row.mode}
                        onChange={(next) =>
                          setMeds((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, mode: next } : p,
                            ),
                          )
                        }
                        hasExisting={hasExisting}
                        disabled={isApplying}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}

            {vacs.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Vaccinations ({vacs.length})
                </Text>
                {vacs.map((row, idx) => {
                  const chip = confidenceChip(row.extracted.confidence);
                  const hasExisting = Boolean(row.extracted.duplicate_of_id);
                  return (
                    <View key={`vac-${idx}`} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>
                          {row.extracted.name}
                        </Text>
                        <View
                          style={[styles.confChip, { backgroundColor: chip.bg }]}
                        >
                          <Text
                            style={[styles.confChipText, { color: chip.color }]}
                          >
                            {chip.label}
                          </Text>
                        </View>
                      </View>
                      {hasExisting ? (
                        <View style={styles.dupRow}>
                          <MaterialCommunityIcons
                            name="link-variant"
                            size={14}
                            color={Colors.orange}
                          />
                          <Text style={styles.dupText}>
                            Already tracked — defaulting to update existing.
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.datesRow}>
                        <Text style={styles.itemMetaMuted}>
                          Administered:{" "}
                          {formatDate(row.extracted.administered_on)}
                        </Text>
                        <Text style={styles.itemMetaMuted}>
                          Next due: {formatDate(row.extracted.next_due_date)}
                        </Text>
                      </View>
                      {row.extracted.administered_by ? (
                        <Text style={styles.itemMetaMuted}>
                          By: {row.extracted.administered_by}
                        </Text>
                      ) : null}
                      {row.extracted.lot_number ? (
                        <Text style={styles.itemMetaMuted}>
                          Lot: {row.extracted.lot_number}
                        </Text>
                      ) : null}
                      {row.extracted.notes ? (
                        <Text style={styles.itemNotes} numberOfLines={3}>
                          {row.extracted.notes}
                        </Text>
                      ) : null}
                      <ModeToggle
                        value={row.mode}
                        onChange={(next) =>
                          setVacs((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, mode: next } : p,
                            ),
                          )
                        }
                        hasExisting={hasExisting}
                        disabled={isApplying}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={isApplying}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.confirmBtn,
                (selectedCount === 0 || isApplying) && styles.confirmBtnDisabled,
              ]}
              disabled={selectedCount === 0 || isApplying}
              onPress={handleConfirm}
            >
              {isApplying ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.confirmText}>
                  {selectedCount > 0
                    ? `Save ${selectedCount} ${selectedCount === 1 ? "item" : "items"}`
                    : "Nothing selected"}
                </Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: { marginBottom: 12 },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  warnCard: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.cream,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  warnText: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingBottom: 12 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.gray500,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: Colors.cream,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  itemName: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  confChip: {
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 3 : 2,
    borderRadius: 999,
  },
  confChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
  },
  dupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dupText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.orange,
  },
  itemMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  itemMetaMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  datesRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  itemNotes: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginTop: 2,
  },
  modeRow: {
    marginTop: 4,
  },
  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modeBtnActive: {
    backgroundColor: Colors.orange,
  },
  modeBtnInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  modeBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
  },
  modeBtnTextActive: { color: Colors.white },
  modeBtnTextInactive: { color: Colors.textSecondary },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
  cancelBtn: {
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  cancelText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.gray500,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.orange,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
