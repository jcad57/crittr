import { Colors } from "@/constants/colors";
import type { DailyProgressCategory } from "@/data/mockDashboard";
import { Image, ImageSource } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import ProgressRing from "./ProgressRing";
import SectionHeader from "./SectionHeader";

// Category ID → icon asset. Kept here so the data model stays plain.
const CATEGORY_ICONS: Record<string, ImageSource> = {
  exercise: require("@/assets/icons/walk-dog-icon.png"),
  meals: require("@/assets/icons/food-icon.png"),
  treats: require("@/assets/icons/dog-bone-icon.png"),
  meds: require("@/assets/icons/medicine-icon.png"),
};

type DailyProgressProps = {
  categories: DailyProgressCategory[];
  onMorePress?: () => void;
};

const RING_SIZE = 68;
const STROKE_WIDTH = 8;

export default function DailyProgress({
  categories,
  onMorePress,
}: DailyProgressProps) {
  return (
    <View style={styles.container}>
      <SectionHeader title="Daily Progress" onMorePress={onMorePress} />
      <View style={styles.row}>
        {categories.map((cat) => {
          const progress = cat.total > 0 ? cat.current / cat.total : 0;
          const iconSource = CATEGORY_ICONS[cat.id];
          return (
            <View key={cat.id} style={styles.item}>
              <Text style={styles.label}>{cat.label}</Text>
              <ProgressRing
                size={RING_SIZE}
                strokeWidth={STROKE_WIDTH}
                progress={progress}
                color={cat.ringColor}
                trackColor={cat.trackColor}
              >
                {iconSource && (
                  <Image source={iconSource} style={styles.icon} />
                )}
              </ProgressRing>
              <Text style={styles.fraction}>
                <Text style={[styles.fractionCurrent]}>{cat.current}</Text>/
                {cat.total}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    gap: 6,
  },
  icon: {
    width: 26,
    height: 26,
  },
  label: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fraction: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.gray400,
  },
  fractionCurrent: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
  },
});
