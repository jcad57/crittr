import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { DailyProgressCategory } from "@/data/mockDashboard";
import { Image, ImageSource } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import ProgressRing from "./ProgressRing";

// Category ID → icon asset. Kept here so the data model stays plain.
const CATEGORY_ICONS: Record<string, ImageSource> = {
  exercise: require("@/assets/icons/walk-dog-icon.png"),
  meals: require("@/assets/icons/food-icon.png"),
  treats: require("@/assets/icons/dog-bone-icon.png"),
  meds: require("@/assets/icons/medicine-icon.png"),
};

type DailyProgressProps = {
  categories: DailyProgressCategory[];
};

const RING_SIZE = 68;
const STROKE_WIDTH = 8;

/** Progress rings only — parent supplies the section label and card chrome. */
export default function DailyProgress({ categories }: DailyProgressProps) {
  return (
    <View style={styles.row}>
      {categories.map((cat) => {
        const progress = cat.total > 0 ? cat.current / cat.total : 0;
        const iconSource = CATEGORY_ICONS[cat.id];
        return (
          <View key={cat.id} style={styles.item}>
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
            <Text style={styles.label}>{cat.label}</Text>
            <Text style={styles.fraction}>
              <Text style={styles.fractionCurrent}>{cat.current}</Text>/
              {cat.total}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fraction: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: Colors.gray400,
  },
  fractionCurrent: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
});
