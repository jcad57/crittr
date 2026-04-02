import { Colors } from "@/constants/colors";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OnboardingCardProps = {
  children: React.ReactNode;
  /** Renders above the scroll area (e.g. step indicator) so it stays pinned to the top. */
  header?: React.ReactNode;
  scrollKey?: number | string;
  /**
   * When false, the body is not wrapped in ScrollView (use for steps that manage their own scroll, e.g. finish).
   */
  scrollBody?: boolean;
};

export default function OnboardingCard({
  children,
  header,
  scrollKey,
  scrollBody = true,
}: OnboardingCardProps) {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollBody) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [scrollKey, scrollBody]);

  /**
   * When a header (e.g. back) sits in normal flow above the ScrollView, `justifyContent:
   * "center"` only centers in the region *below* the header — content looks shifted down.
   * For scrollable cards (sign-in, onboarding steps), overlay the header and use symmetric
   * vertical padding so the body centers on the screen. Non-scroll (finish step) keeps the
   * header in flow so its layout stays unchanged.
   */
  const balancedPadWithHeader =
    header && scrollBody
      ? Math.max(insets.top + 12 + 56, insets.bottom + 24, scrollInsetBottom)
      : 0;

  /** Only scrollable screens overlay the header so the body can vertically center on the screen. */
  const headerOverlay = Boolean(header && scrollBody);

  const headerNode = header ? (
    <View
      pointerEvents="box-none"
      style={[
        headerOverlay ? styles.headerOverlay : styles.headerInFlow,
        {
          paddingTop: insets.top + 12,
          paddingHorizontal: 24,
        },
      ]}
    >
      {header}
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.cream, Colors.creamDark]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />

      {headerNode}

      {scrollBody ? (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              flexGrow: 1,
              justifyContent: "center",
              paddingTop: headerOverlay
                ? balancedPadWithHeader
                : insets.top + 12,
              paddingBottom: headerOverlay
                ? balancedPadWithHeader
                : scrollInsetBottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <View
            style={[
              styles.content,
              { paddingBottom: headerOverlay ? 0 : insets.bottom },
              !header && { paddingTop: 8 },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      ) : (
        <View
          style={[
            styles.flex,
            styles.scrollContent,
            {
              paddingTop: header ? 8 : insets.top + 12,
              /* Non-scroll body (finish): child pins footer + safe area; no extra bottom inset here. */
              paddingBottom: 0,
            },
          ]}
        >
          <View
            style={[
              styles.content,
              styles.bodyFill,
              /* Finish step manages its own safe area + pinned footer; avoid double bottom inset. */
              scrollBody ? { paddingBottom: insets.bottom } : null,
            ]}
          >
            {children}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headerInFlow: {
    zIndex: 1,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
  },
  bodyFill: {
    flex: 1,
  },
});
