import { Colors } from "@/constants/colors";
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
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScanMedicationReviewCard } from "@/components/medical/scanRecord/ScanMedicationReviewCard";
import { ScanVaccinationReviewCard } from "@/components/medical/scanRecord/ScanVaccinationReviewCard";
import { styles } from "@/components/medical/scanRecord/ScanRecordReviewSheet.styles";
import { useScanRecordSheetAnimation } from "@/components/medical/scanRecord/useScanRecordSheetAnimation";

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

  const { mounted, backdropOpacity, sheetTranslateY } =
    useScanRecordSheetAnimation(visible, sheetMaxHeight);

  const [meds, setMeds] = useState<MedRowState[]>([]);
  const [vacs, setVacs] = useState<VacRowState[]>([]);

  /** Rehydrate decisions whenever a new extraction result arrives.
   *  New extractions start as skip so “Add to Crittr” is an opt-in tap (the toggle would
   *  otherwise start “on” and the same tap turned the row off → footer showed nothing selected).
   *  Rows that match an existing record default to update so merging stays one tap. */
  useEffect(() => {
    if (!result) return;
    setMeds(
      result.medications.map((m) => ({
        extracted: m,
        mode: m.duplicate_of_id ? "update" : "skip",
      })),
    );
    setVacs(
      result.vaccinations.map((v) => ({
        extracted: v,
        mode: v.duplicate_of_id ? "update" : "skip",
      })),
    );
  }, [result]);

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
              Crittr AI read the document. Tap{" "}
              <Text style={styles.subEmphasis}>Add to Crittr</Text> or{" "}
              <Text style={styles.subEmphasis}>Update existing</Text> for each
              item to save. You can edit entries later in Health.
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
                {meds.map((row, idx) => (
                  <ScanMedicationReviewCard
                    key={`med-${idx}`}
                    extracted={row.extracted}
                    mode={row.mode}
                    onChangeMode={(next) =>
                      setMeds((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, mode: next } : p,
                        ),
                      )
                    }
                    disabled={isApplying}
                  />
                ))}
              </View>
            ) : null}

            {vacs.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Vaccinations ({vacs.length})
                </Text>
                {vacs.map((row, idx) => (
                  <ScanVaccinationReviewCard
                    key={`vac-${idx}`}
                    extracted={row.extracted}
                    mode={row.mode}
                    onChangeMode={(next) =>
                      setVacs((prev) =>
                        prev.map((p, i) =>
                          i === idx ? { ...p, mode: next } : p,
                        ),
                      )
                    }
                    disabled={isApplying}
                  />
                ))}
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
                    ? selectedCount === 1
                      ? "Finish · 1 item"
                      : `Finish · ${selectedCount} items`
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
