import { Colors } from "@/constants/colors";
import type { ExtractedMedication } from "@/services/medicalRecordParser";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { ScanRecordModeToggle } from "./ScanRecordModeToggle";
import { styles } from "./ScanRecordReviewSheet.styles";

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

export function ScanMedicationReviewCard({
  extracted,
  mode,
  onChangeMode,
  disabled,
}: {
  extracted: ExtractedMedication;
  mode: "skip" | "insert" | "update";
  onChangeMode: (next: "skip" | "insert" | "update") => void;
  disabled?: boolean;
}) {
  const chip = confidenceChip(extracted.confidence);
  const hasExisting = Boolean(extracted.duplicate_of_id);
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{extracted.name}</Text>
        <View style={[styles.confChip, { backgroundColor: chip.bg }]}>
          <Text style={[styles.confChipText, { color: chip.color }]}>
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
        {extracted.dosage?.trim() || "Dose not specified"} ·{" "}
        {medScheduleLabel(extracted)}
      </Text>
      {extracted.condition ? (
        <Text style={styles.itemMetaMuted}>For: {extracted.condition}</Text>
      ) : null}
      <View style={styles.datesRow}>
        <Text style={styles.itemMetaMuted}>
          Last given: {formatDate(extracted.last_given_on)}
        </Text>
        <Text style={styles.itemMetaMuted}>
          Next due: {formatDate(extracted.next_due_date)}
        </Text>
      </View>
      {extracted.notes ? (
        <Text style={styles.itemNotes} numberOfLines={3}>
          {extracted.notes}
        </Text>
      ) : null}
      <ScanRecordModeToggle
        value={mode}
        onChange={onChangeMode}
        hasExisting={hasExisting}
        disabled={disabled}
      />
    </View>
  );
}
