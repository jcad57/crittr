import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHEET_SLIDE_DISTANCE = Math.min(
  360,
  Dimensions.get("window").height * 0.45,
);

type Props = {
  visible: boolean;
  /** User tapped "Not now" or dismissed via backdrop. */
  onDecline: () => void;
  /** User tapped "Yes, scan it" — parent should trigger the scan. */
  onAccept: () => void;
  /** Disables buttons while the scan is running. */
  isScanning?: boolean;
  /**
   * Fires once the sheet has finished its close animation and unmounted.
   * Use this to show another full-screen Modal on iOS (stacking two Modals
   * while the first is dismissing often fails silently and can freeze touch
   * input).
   */
  onFullyDismissed?: () => void;
};

/**
 * Consent sheet offered right after a medical record finishes uploading.
 * Uses the same `Modal` + slide-animation pattern as `MedicalRecordAddFilesModal` so the
 * transition feels continuous.
 */
export default function ScanRecordPromptSheet({
  visible,
  onDecline,
  onAccept,
  isScanning,
  onFullyDismissed,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(
    new Animated.Value(SHEET_SLIDE_DISTANCE),
  ).current;
  const wasShownRef = useRef(false);

  useEffect(() => {
    if (visible) {
      wasShownRef.current = true;
      setMounted(true);
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
      if (finished) {
        setMounted(false);
        onFullyDismissed?.();
      }
    });
  }, [visible, backdropOpacity, sheetTranslateY, onFullyDismissed]);

  return (
    <Modal
      visible={mounted}
      animationType="none"
      transparent
      onRequestClose={onDecline}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.dim, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={isScanning ? undefined : onDecline}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <View style={styles.iconBadge}>
            <MaterialCommunityIcons
              name="text-box-search-outline"
              size={24}
              color={Colors.orange}
            />
          </View>

          <Text style={styles.title}>Scan with Crittr AI?</Text>
          <Text style={styles.body}>
            Let Crittr read the document you just uploaded and pull out any
            medications or vaccinations so we can add them to your pet's
            profile.
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={onDecline}
              disabled={isScanning}
            >
              <Text style={styles.btnSecondaryText}>Not now</Text>
            </Pressable>
            <Pressable
              style={[
                styles.btn,
                styles.btnPrimary,
                isScanning && styles.btnDisabled,
              ]}
              onPress={onAccept}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.btnPrimaryText}>Yes, scan it</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
    marginBottom: 12,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  body: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    backgroundColor: Colors.cream,
  },
  btnSecondaryText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  btnPrimary: {
    backgroundColor: Colors.orange,
  },
  btnPrimaryText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.white,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
