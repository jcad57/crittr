import MedicationSectionHeader from "@/components/petScreens/medication/MedicationSectionHeader";
import { MAX_MEDICATION_DOSAGES } from "@/constants/medicationEditForm";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { MedicationDosageDraft } from "@/utils/medicationDosageDraft";
import { formatUserTime } from "@/utils/userDateTimeFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  dosages: MedicationDosageDraft[];
  onAddDosage: () => void;
  onEditDosage: (index: number) => void;
  onRemoveDosage: (index: number) => void;
  scheduleLabelError?: boolean;
  addDosageButtonError?: boolean;
  dosageRowAmountMissing?: (index: number) => boolean;
  hint?: string;
};

export default function PetMedicationDosageScheduleSection({
  dosages,
  onAddDosage,
  onEditDosage,
  onRemoveDosage,
  scheduleLabelError,
  addDosageButtonError,
  dosageRowAmountMissing,
  hint = "These times appear on the schedule when this medication is due.",
}: Props) {
  const { timeDisplay } = useUserDateTimePrefs();
  const canAdd = dosages.length < MAX_MEDICATION_DOSAGES;

  return (
    <View style={styles.wrap}>
      <MedicationSectionHeader
        icon="clock-outline"
        label="Schedule"
        error={scheduleLabelError}
        right={
          canAdd ? (
            <Pressable
              onPress={onAddDosage}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add dosage"
              style={({ pressed }) => pressed && styles.addPressed}
            >
              <Text
                style={[
                  styles.addText,
                  addDosageButtonError && styles.addTextError,
                ]}
              >
                + Add dosage
              </Text>
            </Pressable>
          ) : null
        }
      />

      {dosages.map((row, index) => {
        const amountMissing = dosageRowAmountMissing
          ? dosageRowAmountMissing(index)
          : false;
        return (
          <View
            key={row.key}
            style={[styles.card, amountMissing && styles.cardError]}
          >
            <View style={styles.cardMain}>
              <Text style={styles.cardTitle}>
                {formatUserTime(row.reminderTime, timeDisplay)}
              </Text>
              <Text
                style={[styles.cardSub, amountMissing && styles.cardSubError]}
                numberOfLines={2}
              >
                {[row.dosageAmount.trim(), row.dosageType.trim()]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.iconBtnPressed,
                ]}
                onPress={() => onEditDosage(index)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Edit dosage"
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={22}
                  color={Colors.gray500}
                />
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.iconBtn,
                  pressed && styles.iconBtnPressed,
                ]}
                onPress={() => onRemoveDosage(index)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Remove dosage"
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={22}
                  color={Colors.error}
                />
              </Pressable>
            </View>
          </View>
        );
      })}

      <View style={styles.infoBox}>
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={Colors.skyDark}
        />
        <Text style={styles.infoText}>{hint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  addPressed: {
    opacity: 0.7,
  },
  addText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  addTextError: {
    color: Colors.error,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  cardError: {
    borderColor: Colors.error,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cardSubError: {
    color: Colors.error,
    fontFamily: Font.uiSemiBold,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnPressed: {
    opacity: 0.65,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.skyLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
