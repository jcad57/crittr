import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useAuth } from "@/context/auth";
import { profileQueryKey } from "@/hooks/queries/queryKeys";
import {
  fetchSubscriptionPaymentSheetParams,
  type ProBillingParam,
} from "@/lib/stripeCheckout";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useStripe } from "@stripe/stripe-react-native";
import { useQueryClient } from "@tanstack/react-query";
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

  const [phase, setPhase] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const presentedRef = useRef(false);

  const prepare = useCallback(async () => {
    setPhase("loading");
    setErrorMessage(null);
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

      let initResult;
      if (params.setupIntentClientSecret) {
        initResult = await initPaymentSheet({
          ...base,
          setupIntentClientSecret: params.setupIntentClientSecret,
        });
      } else if (params.paymentIntentClientSecret) {
        initResult = await initPaymentSheet({
          ...base,
          paymentIntentClientSecret: params.paymentIntentClientSecret,
        });
      } else {
        throw new Error("No payment secret returned from server.");
      }
      const { error: initError } = initResult;

      if (initError) {
        setErrorMessage(initError.message);
        setPhase("error");
        return;
      }
      setPhase("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }, [billing, initPaymentSheet]);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  const onSuccess = useCallback(async () => {
    const uid = session?.user?.id;
    if (uid) {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(uid) });
    }
    Alert.alert("Crittr Pro", "Your trial is active. Enjoy Crittr Pro!", [
      { text: "OK", onPress: () => router.back() },
    ]);
  }, [queryClient, router, session?.user?.id]);

  useEffect(() => {
    if (phase !== "ready" || presentedRef.current) return;
    presentedRef.current = true;
    void (async () => {
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === "Canceled") {
          router.back();
          return;
        }
        Alert.alert("Payment", presentError.message);
        setPhase("error");
        setErrorMessage(presentError.message);
        presentedRef.current = false;
        return;
      }
      await onSuccess();
    })();
  }, [phase, presentPaymentSheet, router, onSuccess]);

  const retry = () => {
    presentedRef.current = false;
    void prepare();
  };

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.topRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={Colors.gray900}
          />
        </Pressable>
      </View>

      <Text style={styles.title}>Secure checkout</Text>
      <Text style={styles.sub}>
        {billing === "annual"
          ? "Annual billing — $39.99/yr after your 7-day trial"
          : "Monthly billing — $4.99/mo after your 7-day trial"}
      </Text>

      {phase === "loading" ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.hint}>Preparing Stripe…</Text>
        </View>
      ) : null}

      {phase === "error" && errorMessage ? (
        <View style={styles.centerBlock}>
          <Text style={styles.err}>{errorMessage}</Text>
          <OrangeButton style={styles.retry} onPress={retry}>
            Try again
          </OrangeButton>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  topRow: {
    marginBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.gray600,
    marginBottom: 24,
  },
  centerBlock: {
    alignItems: "center",
    gap: 16,
    marginTop: 24,
  },
  hint: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.gray500,
    marginTop: 8,
  },
  err: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.error,
    textAlign: "center",
  },
  retry: {
    alignSelf: "stretch",
  },
});
