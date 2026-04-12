import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { HelpCenterFaq } from "@/constants/helpCenterFaqs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const ANIM_MS = 280;

type FaqAccordionItemProps = {
  item: HelpCenterFaq;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
};

function FaqAccordionItem({
  item,
  expanded,
  onToggle,
  isLast,
}: FaqAccordionItemProps) {
  const [contentHeight, setContentHeight] = useState(0);
  const openHeight = useSharedValue(0);
  const chevronTurn = useSharedValue(0);

  useEffect(() => {
    openHeight.value = withTiming(expanded ? contentHeight : 0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
    chevronTurn.value = withTiming(expanded ? 1 : 0, {
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, contentHeight, openHeight, chevronTurn]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: openHeight.value,
    overflow: "hidden",
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronTurn.value * 180}deg` }],
  }));

  return (
    <View style={[styles.itemWrap, !isLast && styles.itemWrapBorder]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.headerRow,
          pressed && styles.headerRowPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={item.question}
      >
        <Text style={styles.question}>{item.question}</Text>
        <Animated.View style={chevronStyle}>
          <MaterialCommunityIcons
            name="chevron-down"
            size={22}
            color={Colors.gray400}
          />
        </Animated.View>
      </Pressable>
      <Animated.View style={[styles.bodyAnim, bodyStyle]}>
        <View
          collapsable={false}
          style={styles.answerMeasureBox}
          onLayout={(e) => {
            const h = Math.ceil(e.nativeEvent.layout.height);
            if (h > 0 && h !== contentHeight) setContentHeight(h);
          }}
        >
          <Text style={styles.answer}>{item.answer}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

type FaqAccordionProps = {
  items: HelpCenterFaq[];
  expandedId: string | null;
  onExpandedChange: (id: string | null) => void;
};

export default function FaqAccordion({
  items,
  expandedId,
  onExpandedChange,
}: FaqAccordionProps) {
  return (
    <View style={styles.card}>
      {items.map((item, index) => (
        <FaqAccordionItem
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          onToggle={() =>
            onExpandedChange(expandedId === item.id ? null : item.id)
          }
          isLast={index === items.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    overflow: "hidden",
  },
  itemWrap: {
    overflow: "hidden",
  },
  itemWrapBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerRowPressed: {
    backgroundColor: Colors.gray50,
  },
  question: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  bodyAnim: {
    position: "relative",
    width: "100%",
  },
  answerMeasureBox: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  answer: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
