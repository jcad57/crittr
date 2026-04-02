import StepIndicator from "@/components/onboarding/StepIndicator";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Image as RNImage,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import OrangeButton from "../buttons/OrangeButton";
import ScreenWrapper from "../ScreenWrapper";

/** Matches `ScreenWrapper` horizontal padding. */
const SCREEN_WRAPPER_PADDING_H = 24;
/** Matches `styles.container` horizontal padding. */
const WELCOME_CONTAINER_PADDING_H = 8;

/** Design reference (iPhone 14-ish) — scale typography & spacing for consistency across devices. */
const REF_WIDTH = 390;
const REF_HEIGHT = 844;

/**
 * Width-based scale for type (clamped so phones don’t swing wildly; tablets cap modestly).
 * Height factor slightly tightens vertical rhythm on short screens.
 */
function welcomeLayoutScale(width: number, height: number) {
  const widthScale = Math.min(Math.max(width / REF_WIDTH, 0.86), 1.12);
  const heightScale = Math.min(Math.max(height / REF_HEIGHT, 0.9), 1.06);
  const uiScale = Math.min(widthScale, heightScale * 1.02);
  const verticalTight = Math.min(1, height / 720);
  return { uiScale, verticalTight };
}

const FEATURES = [
  {
    id: "1",
    text: "Crittr is a platform that helps you track your pet's health and activities.",
  },
  {
    id: "2",
    text: "Log meals, walks, medications, and vet visits in one place—so nothing slips through the cracks.",
  },
  {
    id: "3",
    text: "Share activities with co-carers and keep everyone aligned on your pet's routine.",
  },
];

const AUTO_ADVANCE_MS = 5400;

const WELCOME_BG = require("@/assets/images/welcome-bg.png");
const DOG_CAT_LOGO = require("@/assets/images/dog-cat-img 1.png");
const PET_PAWS = require("@/assets/images/pet-paws-img.png");

/** Intrinsic ratio so we can size width = screen and height scales (contain in a matching box). */
const WELCOME_BG_RESOLVED = RNImage.resolveAssetSource(WELCOME_BG);
const WELCOME_BG_ASPECT =
  WELCOME_BG_RESOLVED?.width && WELCOME_BG_RESOLVED.width > 0
    ? WELCOME_BG_RESOLVED.height / WELCOME_BG_RESOLVED.width
    : 1;

const DOG_CAT_RESOLVED = RNImage.resolveAssetSource(DOG_CAT_LOGO);
const DOG_CAT_ASPECT =
  DOG_CAT_RESOLVED?.width && DOG_CAT_RESOLVED.width > 0
    ? DOG_CAT_RESOLVED.height / DOG_CAT_RESOLVED.width
    : 1;

const PAWS_RESOLVED = RNImage.resolveAssetSource(PET_PAWS);
const PAWS_ASPECT =
  PAWS_RESOLVED?.width && PAWS_RESOLVED.width > 0
    ? PAWS_RESOLVED.height / PAWS_RESOLVED.width
    : 1;

export default function WelcomeContent() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { uiScale, verticalTight } = welcomeLayoutScale(
    windowWidth,
    windowHeight,
  );
  const vs = (n: number) => Math.round(n * uiScale * verticalTight);
  const fs = (n: number) => Math.round(n * uiScale);

  /** Full-bleed width; height from aspect so `contain` isn’t limited by screen height (side gaps). */
  const bgHeight = windowWidth * WELCOME_BG_ASPECT;
  /** Logo above “Crittr”: bounded width, height from asset aspect (~40% smaller than base). */
  const LOGO_SCALE = 0.6;
  const logoWidth = Math.min(windowWidth * 0.52, 220) * LOGO_SCALE;
  const logoHeight = logoWidth * DOG_CAT_ASPECT;
  /** Paws strip at bottom; ~60% smaller than the previous full-width treatment. */
  const PAWS_SCALE = 0.4;
  const pawsWidth = Math.min(windowWidth * 0.92, 420) * PAWS_SCALE;
  const pawsHeight = pawsWidth * PAWS_ASPECT;
  /**
   * Keep copy/buttons clear of the paw art; small gap only — paws sit flush to screen bottom.
   */
  const pawsBottomReserve = pawsHeight + Math.max(4, Math.round(6 * uiScale));
  const slideWidth =
    windowWidth -
    SCREEN_WRAPPER_PADDING_H * 2 -
    WELCOME_CONTAINER_PADDING_H * 2;

  const listRef = useRef<FlatList<(typeof FEATURES)[number]>>(null);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % FEATURES.length;
        listRef.current?.scrollToIndex({
          index: next,
          animated: true,
          viewPosition: 0,
        });
        return next;
      });
    }, AUTO_ADVANCE_MS);
  }, [clearTimer]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const i = Math.round(x / slideWidth);
      const clamped = Math.min(Math.max(i, 0), FEATURES.length - 1);
      setIndex(clamped);
      startTimer();
    },
    [slideWidth, startTimer],
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({
      length: slideWidth,
      offset: slideWidth * i,
      index: i,
    }),
    [slideWidth],
  );

  return (
    <View style={[styles.root, { minHeight: windowHeight }]}>
      <Image
        source={WELCOME_BG}
        style={[styles.bgImage, { width: windowWidth, height: bgHeight }]}
        contentFit="contain"
        pointerEvents="none"
      />
      <View style={styles.screenLayer}>
        <ScreenWrapper>
          <View
            style={[styles.container, { paddingBottom: pawsBottomReserve }]}
          >
            <Image
              source={DOG_CAT_LOGO}
              style={{
                width: logoWidth,
                height: logoHeight,
                marginBottom: vs(8),
              }}
              contentFit="contain"
              accessibilityRole="image"
              accessibilityLabel="Crittr logo"
            />
            <Text
              style={[
                styles.logo,
                {
                  fontSize: fs(52),
                  lineHeight: fs(56),
                  marginBottom: vs(6),
                },
              ]}
            >
              Crittr
            </Text>
            <Text
              style={[
                styles.tagline,
                {
                  fontSize: fs(20),
                  lineHeight: fs(26),
                  marginBottom: vs(12),
                },
              ]}
            >
              Co-care for your best friend
            </Text>

            <View style={[styles.carouselBlock, { marginBottom: vs(12) }]}>
              <FlatList
                ref={listRef}
                data={FEATURES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View
                    style={{
                      width: slideWidth,
                      minHeight: Math.max(56, vs(80)),
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={[
                        styles.subheadline,
                        { fontSize: fs(18), lineHeight: fs(24) },
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                )}
                getItemLayout={getItemLayout}
                onMomentumScrollEnd={onMomentumScrollEnd}
              />
              <StepIndicator totalSteps={FEATURES.length} currentStep={index} />
            </View>

            <OrangeButton
              style={[styles.ctaButton, { marginBottom: vs(22) }]}
              onPress={() => router.push("/(auth)/(onboarding)?intent=signup")}
            >
              Create Account
            </OrangeButton>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable style={styles.signInRow}>
                <Text style={[styles.signInLink, { fontSize: fs(16) }]}>
                  I already have an account!{" "}
                </Text>
                <Text
                  style={[styles.signInLinkBold, { fontSize: fs(16) }]}
                >
                  Sign In
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScreenWrapper>
      </View>

      <View style={styles.pawsWrap} pointerEvents="none">
        <Image
          source={PET_PAWS}
          style={[styles.pawsImage, { width: pawsWidth, height: pawsHeight }]}
          contentFit="contain"
          contentPosition="bottom"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  screenLayer: {
    flex: 1,
    zIndex: 2,
  },
  bgImage: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
  },
  logo: {
    fontFamily: Font.displayBold,
    letterSpacing: -0.3,
    textAlign: "center",
    color: Colors.orange,
  },
  tagline: {
    fontFamily: "InstrumentSans-SemiBold",
    textAlign: "center",
    color: Colors.textSecondary,
  },
  carouselBlock: {
    width: "100%",
  },
  subheadline: {
    fontFamily: "InstrumentSans-Regular",
    textAlign: "center",
    color: Colors.textSecondary,
    paddingHorizontal: 4,
  },
  ctaButton: {},
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  signInLink: {
    fontFamily: "InstrumentSans-Regular",
    color: Colors.textPrimary,
  },
  signInLinkBold: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
  pawsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 1,
  },
  pawsImage: {
    alignSelf: "center",
  },
});
