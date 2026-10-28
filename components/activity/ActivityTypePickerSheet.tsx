import ActivityTypeStep from "@/components/activity/ActivityTypeStep";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { ActivityType, PetType } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  petType: PetType | null;
  onClose: () => void;
  onSelect: (type: ActivityType) => void;
};

/** Dismiss fully before navigating, so a native modal cannot cover the next flow. */
export default function ActivityTypePickerSheet({
  visible,
  petType,
  onClose,
  onSelect,
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [selected, setSelected] = useState<ActivityType | null>(null);
  const choice = useRef<ActivityType | null>(null);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    return () => listener.remove();
  }, []);

  const finishSelection = useCallback(() => {
    const type = choice.current;
    choice.current = null;
    if (type) onSelect(type);
  }, [onSelect]);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? 280 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    const frame = requestAnimationFrame(() => {
      if (visible) {
        choice.current = null;
        setSelected(null);
        setMounted(true);
      }
      animation.start(({ finished }) => {
        if (finished && !visible) setMounted(false);
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      animation.stop();
    };
  }, [visible, reduceMotion, progress]);

  // iOS reports actual native dismissal. Android removes the modal at commit;
  // its effect runs afterwards, before pushing the existing logging screen.
  useEffect(() => {
    if (!mounted && !visible && Platform.OS !== "ios") finishSelection();
  }, [mounted, visible, finishSelection]);

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
      onDismiss={finishSelection}
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: progress },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close activity picker"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.87,
              paddingBottom: Math.max(insets.bottom, 16),
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handle} accessibilityElementsHidden />
          <View style={styles.header}>
            <Text style={styles.title}>Log an activity</Text>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel="Close activity picker"
            >
              <MaterialCommunityIcons
                name="close"
                size={23}
                color={Colors.textPrimary}
              />
            </Pressable>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <ActivityTypeStep
              petType={petType}
              selected={selected}
              showTitle={false}
              disabled={!visible || selected != null}
              onSelect={(type) => {
                if (choice.current || !visible) return;
                choice.current = type;
                setSelected(type);
                onClose();
              }}
            />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(16,23,25,0.35)" },
  sheet: {
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.creamDark,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.textPrimary,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingBottom: 10 },
});
