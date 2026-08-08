import ScheduleActivityCard from "@/components/ui/schedule/ScheduleActivityCard";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { PetScheduleItem } from "@/types/database";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, FadeInDown } from "react-native-reanimated";

type Props = {
  title: string;
  items: PetScheduleItem[];
  petType?: string | null;
  /** Changes with date/pet so entering animations replay on each load. */
  animationKey: string;
  /** Global stagger offset so morning → evening stacks continuously. */
  staggerStartIndex?: number;
  onToggleComplete: (item: PetScheduleItem) => void;
  onEdit: (item: PetScheduleItem) => void;
};

const ENTER_MS = 450;
const STAGGER_MS = 100;
/** Start below the final slot so cards rise into place (Reanimated `FadeInDown`). */
const SLIDE_UP_FROM_Y = 32;

export default function SchedulePeriodSection({
  title,
  items,
  petType = null,
  animationKey,
  staggerStartIndex = 0,
  onToggleComplete,
  onEdit,
}: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {items.map((item, index) => {
          const staggerIndex = staggerStartIndex + index;
          return (
            <Animated.View
              key={`${animationKey}:${item.id}`}
              entering={FadeInDown.duration(ENTER_MS)
                .delay(staggerIndex * STAGGER_MS)
                .easing(Easing.out(Easing.cubic))
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: SLIDE_UP_FROM_Y }],
                })}
            >
              <ScheduleActivityCard
                item={item}
                petType={petType}
                onToggleComplete={() => onToggleComplete(item)}
                onEdit={item.completed_at ? () => onEdit(item) : undefined}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    overflow: "visible",
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  list: {
    gap: 8,
    overflow: "visible",
  },
});
