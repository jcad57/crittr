import {
  ACTIVITY_TYPE_LOG_ICONS,
  getExerciseActivityIcon,
  getMealsActivityIcon,
} from "@/constants/activityTypeProgressIcons";
import { Colors } from "@/constants/colors";
import type { ActivityType } from "@/types/database";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Option = {
  type: ActivityType;
  label: string;
  iconSource: (typeof ACTIVITY_TYPE_LOG_ICONS)[keyof typeof ACTIVITY_TYPE_LOG_ICONS];
  color: string;
  bg: string;
};

function midOptions(petType: string | null | undefined): Option[] {
  return [
    {
      type: "food",
      label: "Food",
      iconSource: getMealsActivityIcon(petType),
      color: Colors.progressMeals,
      bg: Colors.progressMealsTrack,
    },
    {
      type: "medication",
      label: "Medication",
      iconSource: ACTIVITY_TYPE_LOG_ICONS.medication,
      color: Colors.progressMeds,
      bg: Colors.progressMedsTrack,
    },
  ];
}

function exerciseOption(petType: string | null | undefined): Option {
  return {
    type: "exercise",
    label: "Exercise",
    iconSource: getExerciseActivityIcon(petType),
    color: Colors.progressExercise,
    bg: Colors.progressExerciseTrack,
  };
}

const DOG_EXTRA: Option[] = [
  {
    type: "training",
    label: "Training",
    iconSource: ACTIVITY_TYPE_LOG_ICONS.training,
    color: Colors.progressExercise,
    bg: Colors.progressExerciseTrack,
  },
  {
    type: "potty",
    label: "Potty",
    iconSource: ACTIVITY_TYPE_LOG_ICONS.potty,
    color: Colors.progressTreats,
    bg: Colors.progressTreatsTrack,
  },
];

const CAT_EXTRA: Option[] = [
  {
    type: "maintenance",
    label: "Maintenance",
    iconSource: ACTIVITY_TYPE_LOG_ICONS.maintenance,
    color: Colors.progressTreats,
    bg: Colors.progressTreatsTrack,
  },
];

function optionsForPetType(petType: string | null | undefined): Option[] {
  const exercise = exerciseOption(petType);
  const mid = midOptions(petType);
  if (petType === "cat") {
    return [exercise, ...mid, ...CAT_EXTRA];
  }
  return [exercise, ...mid, ...DOG_EXTRA];
}

type Props = {
  petType: string | null | undefined;
  selected: ActivityType | null;
  onSelect: (type: ActivityType) => void;
};

const GRID_ICON_SIZE = 28;

export default function ActivityTypeStep({
  petType,
  selected,
  onSelect,
}: Props) {
  const options = useMemo(() => optionsForPetType(petType), [petType]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What type of activity are you logging?</Text>

      <View style={styles.grid}>
        {options.map((opt) => {
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
                <Image
                  source={opt.iconSource}
                  style={styles.gridIcon}
                  contentFit="contain"
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
  gridIcon: {
    width: GRID_ICON_SIZE,
    height: GRID_ICON_SIZE,
  },
  cardLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
