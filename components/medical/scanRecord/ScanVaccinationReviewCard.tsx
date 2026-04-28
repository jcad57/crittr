import { Colors } from "@/constants/colors";
import type { ExtractedVaccination } from "@/services/medicalRecordParser";
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

export function ScanVaccinationReviewCard({
  extracted,
  mode,
  onChangeMode,
  disabled,
}: {
  extracted: ExtractedVaccination;
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
      <View style={styles.datesRow}>
        <Text style={styles.itemMetaMuted}>
          Administered: {formatDate(extracted.administered_on)}
        </Text>
        <Text style={styles.itemMetaMuted}>
          Expires: {formatDate(extracted.expires_on)}
        </Text>
      </View>
      {extracted.administered_by ? (
        <Text style={styles.itemMetaMuted}>
          By: {extracted.administered_by}
        </Text>
      ) : null}
      {extracted.lot_number ? (
        <Text style={styles.itemMetaMuted}>Lot: {extracted.lot_number}</Text>
      ) : null}
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
