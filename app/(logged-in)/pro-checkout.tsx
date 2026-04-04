import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useAuth } from "@/context/auth";
import { useAuthStore } from "@/stores/authStore";
import { profileQueryKey } from "@/hooks/queries/queryKeys";
import {
  fetchSubscriptionPaymentSheetParams,
  waitForProActivation,
  type ProBillingParam,
} from "@/lib/stripeCheckout";
import { useStripe } from "@stripe/stripe-react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Phase = "loading" | "ready" | "dismissed" | "confirming" | "error";

export default function ProCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { billing: billingParam } = useLocalSearchParams<{
    billing?: string;
  }>();

  const billing: ProBillingParam =
    billingParam === "annual" ? "annual" : "monthly";

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const initRef = useRef(initPaymentSheet);
  initRef.current = initPaymentSheet;
  const presentRef = useRef(presentPaymentSheet);
  presentRef.current = presentPaymentSheet;

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);
  const sheetReadyRef = useRef(false);

  // ── Step 1: fetch params + init PaymentSheet ────────────────────────
  const prepare = useCallback(async () => {
    setPhase("loading");
    setErrorMessage(null);
    setPaymentDone(false);
    sheetReadyRef.current = false;

    try {
      if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error(
          "Stripe is not configured. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment.",
        );
      }

      const params = await fetchSubscriptionPaymentSheetParams(billing);

      const base = {
        merchantDisplayName: "Crittr",
        customerId: params.customerId,
        customerEphemeralKeySecret: params.ephemeralKey,
        allowsDelayedPaymentMethods: true,
        returnURL: "crittr://stripe-redirect",
      } as const;

      const initResult = params.setupIntentClientSecret
        ? await initRef.current({
            ...base,
            setupIntentClientSecret: params.setupIntentClientSecret,
          })
        : params.paymentIntentClientSecret
          ? await initRef.current({
              ...base,
              paymentIntentClientSecret: params.paymentIntentClientSecret,
            })
          : { error: { message: "No payment secret returned from server." } };

      if ("error" in initResult && initResult.error) {
        throw new Error(initResult.error.message);
      }

      sheetReadyRef.current = true;
      setPhase("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }, [billing]);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  // ── Present the Stripe PaymentSheet ─────────────────────────────────
  const openPaymentSheet = useCallback(async () => {
    if (!sheetReadyRef.current) return;

    try {
      const { error: presentError } = await presentRef.current();
      if (presentError) {
        if (presentError.code === "Canceled") {
          setPhase("dismissed");
          return;
        }
        Alert.alert("Payment", presentError.message);
        setErrorMessage(presentError.message);
        setPhase("error");
        return;
      }
      setPaymentDone(true);
      setPhase("confirming");
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Payment could not be completed.",
      );
      setPhase("error");
    }
  }, []);

  // Auto-present when first ready
  useEffect(() => {
    if (phase !== "ready") return;
    void openPaymentSheet();
  }, [phase, openPaymentSheet]);

  // ── Confirm Pro status via DB poll ──────────────────────────────────
  useEffect(() => {
    if (phase !== "confirming") return;
    let cancelled = false;

    void (async () => {
      try {
        await waitForProActivation();
        if (cancelled) return;

        const uid =
          useAuthStore.getState().session?.user?.id ?? session?.user?.id;
        if (uid) {
          await queryClient.invalidateQueries({
            queryKey: profileQueryKey(uid),
          });
        }
        router.replace("/(logged-in)/welcome-to-pro" as Href);
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(
          e instanceof Error
            ? e.message
            : "Could not confirm your subscription.",
        );
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, queryClient, router, session?.user?.id]);

  // ── Retry handler ───────────────────────────────────────────────────
  const retry = useCallback(() => {
    if (paymentDone) {
      setPhase("confirming");
    } else {
      void prepare();
    }
  }, [paymentDone, prepare]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {/* ── Loading: centered spinner ─────────────────────────────── */}
      {phase === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.hint}>Getting your payment ready…</Text>
        </View>
      )}

      {/* ── Confirming: centered spinner ──────────────────────────── */}
      {phase === "confirming" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.hint}>Activating Crittr Pro…</Text>
        </View>
      )}

      {/* ── Dismissed: user closed Stripe modal ───────────────────── */}
      {phase === "dismissed" && (
        <View style={styles.centered}>
          <Text style={styles.title}>Ready to checkout?</Text>
          <Text style={styles.sub}>
            {billing === "annual"
              ? "$39.99/yr after your 7-day free trial"
              : "$4.99/mo after your 7-day free trial"}
          </Text>

          <View style={styles.actions}>
            <OrangeButton onPress={openPaymentSheet}>
              Open payment screen
            </OrangeButton>
            <Pressable
              style={styles.secondaryBtn}
              onPress={goBack}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Go back to dashboard</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Error ─────────────────────────────────────────────────── */}
      {phase === "error" && errorMessage && (
        <View style={styles.centered}>
          <Text style={styles.err}>{errorMessage}</Text>
          <View style={styles.actions}>
            <OrangeButton onPress={retry}>
              {paymentDone ? "Retry activation" : "Try again"}
            </OrangeButton>
            <Pressable
              style={styles.secondaryBtn}
              onPress={goBack}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Go back to dashboard</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.gray600,
    textAlign: "center",
    marginBottom: 8,
  },
  hint: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.gray500,
    marginTop: 14,
  },
  actions: {
    width: "100%",
    marginTop: 28,
    gap: 14,
  },
  secondaryBtn: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryLabel: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.gray600,
  },
  err: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 4,
  },
});
