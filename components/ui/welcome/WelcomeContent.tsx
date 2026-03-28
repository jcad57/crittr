import StepIndicator from "@/components/onboarding/StepIndicator";
import { Colors } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
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

export default function WelcomeContent() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
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
    <>
      <LinearGradient
        colors={["#FDB97E", "#F4845F", "#F27059"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.headline}>Co-care for your best friend</Text>

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
            onPress={() => router.push("/(auth)/(onboarding)")}
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 8,
    paddingBottom: 32,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  headline: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 32,
    textAlign: "center",
    color: Colors.textPrimary,
    marginBottom: 8,
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
