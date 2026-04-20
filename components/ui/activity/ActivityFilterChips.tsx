import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityFilterCategory } from "@/data/activityHistory";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const FILTERS: { id: ActivityFilterCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "exercise", label: "Exercise" },
  { id: "meals", label: "Meals" },
  { id: "treats", label: "Treats" },
  { id: "meds", label: "Meds" },
  { id: "vet_visit", label: "Vet Visits" },
  { id: "training", label: "Training" },
  { id: "potty", label: "Potty" },
];

type Props = {
  active: ActivityFilterCategory;
  onChange: (id: ActivityFilterCategory) => void;
};

export default function ActivityFilterChips({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {FILTERS.map((f) => {
          const selected = active === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => onChange(f.id)}
              style={[styles.chip, selected && styles.chipActive]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -4,
  },
  scroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  chipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.white,
  },
});
