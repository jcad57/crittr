import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import {
  formatExercisePlanSubline,
  type ExercisePlanDraft,
} from "@/utils/exercisePlans";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  plans: ExercisePlanDraft[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  addButtonError?: boolean;
  /** Optional section label override. */
  sectionTitle?: string;
  helperText?: string;
};

export default function ExercisePlansSection({
  plans,
  onAdd,
  onEdit,
  onRemove,
  addButtonError,
  sectionTitle = "Activities",
  helperText,
}: Props) {
  const { timeDisplay } = useUserDateTimePrefs();

  return (
    <View>
      <Text style={styles.sectionTitle}>{sectionTitle}</Text>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}

      {plans.map((plan, index) => (
        <View key={plan.key} style={styles.card}>
          <View style={styles.cardMain}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {plan.label.trim() || "Untitled"}
            </Text>
            <Text style={styles.cardSub} numberOfLines={2}>
              {formatExercisePlanSubline(plan, timeDisplay)}
            </Text>
            {plan.notes.trim() ? (
              <Text style={styles.cardNotes} numberOfLines={2}>
                {plan.notes.trim()}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconBtnPressed,
              ]}
              onPress={() => onEdit(index)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Edit activity"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={22}
                color={Colors.orange}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.iconBtn,
                pressed && styles.iconBtnPressed,
              ]}
              onPress={() => onRemove(index)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Remove activity"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color={Colors.error}
              />
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [
          styles.addBtn,
          addButtonError && styles.addBtnError,
          pressed && styles.addBtnPressed,
        ]}
        onPress={onAdd}
      >
        <MaterialCommunityIcons
          name="plus-circle-outline"
          size={22}
          color={addButtonError ? Colors.error : Colors.orange}
        />
        <Text
          style={[styles.addBtnText, addButtonError && styles.addBtnTextError]}
        >
          Add activity
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  helper: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cardNotes: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 4,
  },
  cardActions: { flexDirection: "row", gap: 4 },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  iconBtnPressed: { opacity: 0.7 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderStyle: "dashed",
    backgroundColor: Colors.orangeLight,
    marginBottom: 8,
  },
  addBtnError: {
    borderColor: Colors.error,
    backgroundColor: "#FEF2F2",
  },
  addBtnPressed: { opacity: 0.85 },
  addBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  addBtnTextError: { color: Colors.error },
});
