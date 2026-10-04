import { Colors } from "@/theme/colors";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHEET_SLIDE_DISTANCE = Math.min(
  520,
  Dimensions.get("window").height * 0.7,
);

type Props = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Extra padding above the home indicator. */
  contentPaddingBottom?: number;
};

/**
 * Shared slide-up sheet used by Pro celebration and contextual soft paywalls.
 * Matches the medical-record sheet pattern (Modal + native-driver slide).
 */
export function ProBottomSheet({
  visible,
  onClose,
  children,
  contentPaddingBottom = 12,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(
    new Animated.Value(SHEET_SLIDE_DISTANCE),
  ).current;
  const wasShownRef = useRef(false);

  useEffect(() => {
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      wasShownRef.current = true;
      setMounted(true);
      if (reduceMotion) {
        backdropOpacity.setValue(1);
        sheetTranslateY.setValue(0);
        return;
      }
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_SLIDE_DISTANCE);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!wasShownRef.current) return;
    wasShownRef.current = false;
    if (reduceMotion) {
      setMounted(false);
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_SLIDE_DISTANCE,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, reduceMotion, backdropOpacity, sheetTranslateY]);

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.dim, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + contentPaddingBottom,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.handle} accessibilityElementsHidden />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 24, 39, 0.45)",
  },
  sheet: {
    backgroundColor: Colors.black,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray200,
    marginBottom: 16,
  },
});
