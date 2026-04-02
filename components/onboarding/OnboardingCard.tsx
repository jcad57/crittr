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

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.cream, Colors.creamDark]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />

      {header ? (
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 12,
              paddingHorizontal: 24,
            },
          ]}
        >
          {header}
        </View>
      ) : null}

      {scrollBody ? (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              flexGrow: 1,
              justifyContent: "center",
              paddingTop: header ? 8 : insets.top + 12,
              paddingBottom: scrollInsetBottom,
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
              { paddingBottom: insets.bottom },
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
  header: {
    zIndex: 1,
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
