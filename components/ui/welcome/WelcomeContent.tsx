import StepIndicator from "@/components/onboarding/StepIndicator";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image as RNImage,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
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

const WELCOME_BG = require("@/assets/images/temp_bg.png");

/** Intrinsic ratio so we can size width = screen and height scales (contain in a matching box). */
const WELCOME_BG_RESOLVED = RNImage.resolveAssetSource(WELCOME_BG);
const WELCOME_BG_ASPECT =
  WELCOME_BG_RESOLVED?.width && WELCOME_BG_RESOLVED.width > 0
    ? WELCOME_BG_RESOLVED.height / WELCOME_BG_RESOLVED.width
    : 1;

export default function WelcomeContent() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  /** Full-bleed width; height from aspect so `contain` isn’t limited by screen height (side gaps). */
  const bgHeight = windowWidth * WELCOME_BG_ASPECT;
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
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.logo}>Crittr</Text>
          <Text style={styles.tagline}>Co-care for your best friend</Text>

          <View style={styles.carouselBlock}>
            <FlatList
              ref={listRef}
              data={FEATURES}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.slide, { width: slideWidth }]}>
                  <Text style={styles.subheadline}>{item.text}</Text>
                </View>
              )}
              getItemLayout={getItemLayout}
              onMomentumScrollEnd={onMomentumScrollEnd}
            />
            <StepIndicator totalSteps={FEATURES.length} currentStep={index} />
          </View>

          <OrangeButton
            style={styles.ctaButton}
            onPress={() => router.push("/(auth)/(onboarding)?intent=signup")}
          >
            Create Account
          </OrangeButton>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable style={styles.signInRow}>
              <Text style={styles.signInLink}>I already have an account! </Text>
              <Text style={styles.signInLinkBold}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScreenWrapper>
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
    paddingBottom: 32,
  },
  logo: {
    fontFamily: Font.displayBold,
    fontSize: 52,
    lineHeight: 56,
    letterSpacing: -0.3,
    textAlign: "center",
    color: Colors.orange,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  carouselBlock: {
    width: "100%",
    marginBottom: 12,
  },
  slide: {
    justifyContent: "center",
    minHeight: 80,
  },
  subheadline: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 18,
    textAlign: "center",
    color: Colors.textSecondary,
    paddingHorizontal: 4,
  },
  ctaButton: {
    marginBottom: 22,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  signInLink: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  signInLinkBold: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
});
