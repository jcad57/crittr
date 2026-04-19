import { Colors } from "@/constants/colors";
import { usePetsQuery } from "@/hooks/queries";
import { usePetStore } from "@/stores/petStore";
import type { ActivityType } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo } from "react";
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
    type: "training",
    label: "Training",
    icon: "school",
    color: Colors.progressExercise,
    bg: Colors.progressExerciseTrack,
  },
];

type Props = {
  selected: ActivityType | null;
  onSelect: (type: ActivityType) => void;
};

export default function ActivityTypeStep({ selected, onSelect }: Props) {
  const activePetId = usePetStore((s) => s.activePetId);
  const { data: allPets } = usePetsQuery();
  const activePetName = useMemo(() => {
    if (!activePetId || !allPets?.length) return null;
    return allPets.find((p) => p.id === activePetId)?.name?.trim() ?? null;
  }, [activePetId, allPets]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What type of activity are you logging?</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  title: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 36,
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
});
