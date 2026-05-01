import { Colors } from "@/constants/colors";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import {
  AUTH_STACK_HORIZONTAL_PADDING,
  authContentColumnStyle,
} from "@/lib/responsiveUi";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  LayoutChangeEvent,
  Platform,
  Image as RNImage,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WELCOME_BG = require("@/assets/images/welcome-bg.png");
const WELCOME_BG_RESOLVED = RNImage.resolveAssetSource(WELCOME_BG);
const WELCOME_BG_ASPECT =
  WELCOME_BG_RESOLVED?.width && WELCOME_BG_RESOLVED.width > 0
    ? WELCOME_BG_RESOLVED.height / WELCOME_BG_RESOLVED.width
    : 1;

type OnboardingCardProps = {
  children: React.ReactNode;
  /** Renders above the scroll area (e.g. step indicator) so it stays pinned to the top. */
  header?: React.ReactNode;
  scrollKey?: number | string;
  /**
   * When false, the body is not wrapped in ScrollView (use for steps that manage their own scroll, e.g. finish).
   */
  scrollBody?: boolean;
  /** Vertically center body content in the viewport (e.g. sign-in). */
  centerContent?: boolean;
  /** Top `welcome-bg` art like the welcome screen (sign-in). */
  welcomeBackground?: boolean;
};

export default function OnboardingCard({
  children,
  header,
  scrollKey,
  scrollBody = true,
  centerContent = false,
  welcomeBackground = false,
}: OnboardingCardProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const welcomeBgHeight = welcomeBackground
    ? windowWidth * WELCOME_BG_ASPECT
    : 0;
  const scrollInsetBottom = useFloatingNavScrollInset();
  const scrollRef = useRef<ComponentRef<typeof KeyboardAwareScrollView>>(null);
  /** Measured height of the absolute header (safe-area padding + back row or step dots). */
  const [overlayHeaderHeight, setOverlayHeaderHeight] = useState(0);

  useEffect(() => {
    if (scrollBody) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [scrollKey, scrollBody]);

  /** Reset measure when step changes so we don’t briefly use the previous header’s height. */
  useLayoutEffect(() => {
    setOverlayHeaderHeight(0);
  }, [scrollKey]);

  const onOverlayHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setOverlayHeaderHeight((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
  }, []);

  /** Bottom inset only — do not mirror the large top reserve or content becomes taller than the viewport and scrolls with empty space. */
  const scrollBottomPad = Math.max(insets.bottom + 16, scrollInsetBottom);

  /** Only scrollable screens overlay the header so the body can vertically center on the screen. */
  const headerOverlay = Boolean(header && scrollBody);

  /**
   * Top padding must clear the full overlaid header (not just its `paddingTop`), otherwise
   * step dots / back chevron overlap the first lines of form content.
   */
  const overlayScrollTopFallback = insets.top + 12 + 32;
  const scrollPaddingTopRaw = headerOverlay
    ? Math.max(overlayHeaderHeight, overlayScrollTopFallback)
    : insets.top + 12;
  const scrollPaddingTop = Number.isFinite(scrollPaddingTopRaw)
    ? scrollPaddingTopRaw
    : overlayScrollTopFallback;

  /**
   * Lets `flex: 1` step content (e.g. loading spinners) fill the space between scroll
   * padding so indicators sit in the visual center of the page.
   */
  const scrollBottomPadSafe = Number.isFinite(scrollBottomPad)
    ? scrollBottomPad
    : 0;
  const minBodyRaw = windowHeight - scrollPaddingTop - scrollBottomPadSafe;
  const minScrollBodyHeight = Number.isFinite(minBodyRaw)
    ? Math.max(0, minBodyRaw)
    : 0;

  /**
   * With `justifyContent: "center"`, flex centers in the area inside padding. If top padding
   * (header reserve) is larger than bottom, the block sits low. Mirror with equal vertical
   * padding so the midpoint matches the screen; `max` keeps nav/keyboard bottom inset.
   */
  const symmetricVerticalPad = centerContent
    ? Math.max(scrollPaddingTop, scrollBottomPadSafe)
    : null;

  const headerNode = header ? (
    <View
      pointerEvents="box-none"
      onLayout={headerOverlay ? onOverlayHeaderLayout : undefined}
      style={[
        headerOverlay
          ? welcomeBackground
            ? styles.headerOverlayWelcomeBg
            : styles.headerOverlay
          : styles.headerInFlow,
        {
          paddingTop: insets.top + 12,
          paddingHorizontal: AUTH_STACK_HORIZONTAL_PADDING,
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

      {welcomeBackground ? (
        <Image
          source={WELCOME_BG}
          style={[
            styles.welcomeBgImage,
            { width: windowWidth, height: welcomeBgHeight },
          ]}
          contentFit="contain"
          pointerEvents="none"
        />
      ) : null}

      {headerNode}

      {scrollBody ? (
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={[
            styles.flex,
            welcomeBackground && styles.scrollAboveWelcomeBg,
          ]}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: symmetricVerticalPad ?? scrollPaddingTop,
              paddingBottom: symmetricVerticalPad ?? scrollBottomPad,
              ...(centerContent && {
                flexGrow: 1,
                justifyContent: "center" as const,
              }),
            },
          ]}
          bottomOffset={20}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          alwaysBounceVertical={false}
          removeClippedSubviews={!welcomeBackground}
          {...(Platform.OS === "android"
            ? ({ overScrollMode: "never" } as const)
            : {})}
        >
          <View
            style={[
              styles.content,
              !centerContent && { minHeight: minScrollBodyHeight },
              { paddingBottom: headerOverlay ? 0 : insets.bottom },
              !header && { paddingTop: 8 },
              welcomeBackground && { overflow: "visible" as const },
            ]}
          >
            <View
              style={[
                authContentColumnStyle(),
                scrollBody && !centerContent ? { flexGrow: 1 } : null,
              ]}
            >
              {children}
            </View>
          </View>
        </KeyboardAwareScrollView>
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
            <View style={[authContentColumnStyle(), { flexGrow: 1 }]}>
              {children}
            </View>
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
    zIndex: 3,
    /** Opaque bar so ScrollView content does not show through when scrolling under the step indicator. */
    backgroundColor: Colors.cream,
  },
  /** Transparent so `welcome-bg` shows behind the back control (sign-in). */
  headerOverlayWelcomeBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 3,
    backgroundColor: "transparent",
  },
  welcomeBgImage: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 1,
  },
  scrollAboveWelcomeBg: {
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: AUTH_STACK_HORIZONTAL_PADDING,
  },
  content: {
    width: "100%",
  },
  bodyFill: {
    flex: 1,
  },
});
