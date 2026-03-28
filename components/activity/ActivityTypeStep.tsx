import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import type { ActivityType } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Option = {
  type: ActivityType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
};

const OPTIONS: Option[] = [
  {
    type: "exercise",
    label: "Exercise",
    icon: "run",
    color: Colors.progressExercise,
    bg: Colors.progressExerciseTrack,
  },
  {
    type: "food",
    label: "Food",
    icon: "food-drumstick",
    color: Colors.progressMeals,
    bg: Colors.progressMealsTrack,
  },
  {
    type: "medication",
    label: "Medication",
    icon: "pill",
    color: Colors.progressMeds,
    bg: Colors.progressMedsTrack,
  },
  {
    type: "vet_visit",
    label: "Vet Visit",
    icon: "stethoscope",
    color: Colors.progressTreats,
    bg: Colors.progressTreatsTrack,
  },
];

type Props = {
  selected: ActivityType | null;
  onSelect: (type: ActivityType) => void;
  onBack: () => void;
};

export default function ActivityTypeStep({
  selected,
  onSelect,
  onBack,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log an activity</Text>
      <Text style={styles.subtitle}>What type of activity?</Text>

      <View style={styles.grid}>
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.type;
          return (
            <Pressable
              key={opt.type}
              style={[
                styles.card,
                isActive && { borderColor: opt.color, borderWidth: 2 },
              ]}
              onPress={() => onSelect(opt.type)}
            >
              <View style={[styles.iconCircle, { backgroundColor: opt.bg }]}>
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={28}
                  color={opt.color}
                />
              </View>
              <Text
                style={[styles.cardLabel, isActive && { color: opt.color }]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <OrangeButton
        onPress={() => {
          if (selected) onSelect(selected);
        }}
        disabled={!selected}
        style={styles.cta}
      >
        Continue
      </OrangeButton>

      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingVertical: 20,
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  spacer: { flex: 1, minHeight: 24 },
  cta: { marginTop: 12 },
  backButton: {
    alignSelf: "center",
    paddingTop: 16,
  },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
