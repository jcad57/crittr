import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { Font } from "@/constants/typography";
import { useProPricingQuery } from "@/hooks/queries";
import {
  profileQueryKey,
  subscriptionDetailsQueryKey,
} from "@/hooks/queries/queryKeys";
import {
  ProPurchaseException,
  fetchProPackageForBilling,
  purchaseProPackage,
  restoreProPurchases,
  waitForProActivation,
  type ProBillingParam,
} from "@/lib/iap/checkout";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Phase =
  | "preflight"
  | "loading"
  | "ready"
  | "dismissed"
  | "confirming"
  | "error";

export default function ProCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { billing: billingParam, returnTo } = useLocalSearchParams<{
    billing?: string;
    returnTo?: string;
  }>();

  const billing: ProBillingParam =
    billingParam === "annual" ? "annual" : "monthly";

  const { data: pricingData } = useProPricingQuery();
  const pricing = pricingData ?? PRO_PRICING_FALLBACK;

  const [phase, setPhase] = useState<Phase>("preflight");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  /** Mirrors what the system sheet just charged so we can confirm the user. */
  const purchasedRef = useRef(false);

  const startPurchase = useCallback(async () => {
    setPhase("loading");
    setErrorMessage(null);
    purchasedRef.current = false;

    try {
      const pkg = await fetchProPackageForBilling(billing);
      if (!pkg) {
        throw new Error(
          "Crittr Pro is not available right now. Please try again in a moment.",
        );
      }
      const result = await purchaseProPackage(pkg);
      purchasedRef.current = true;
      if (result.hasCrittrPro) {
        setPhase("confirming");
      } else {
        /** RC reported success without entitlement (e.g. unverified ask-to-buy); poll backend. */
        setPhase("confirming");
      }
    } catch (e) {
      if (e instanceof ProPurchaseException && e.userCancelled) {
        setPhase("dismissed");
        return;
      }
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setErrorMessage(msg);
      setPhase("error");
    }
  }, [billing]);

  useEffect(() => {
    if (phase !== "preflight") return;
    void startPurchase();
  }, [phase, startPurchase]);

  useEffect(() => {
    if (phase !== "confirming") return;
    let cancelled = false;

    void (async () => {
      try {
        await waitForProActivation(28_000);
        if (cancelled) return;
        const uid = useAuthStore.getState().session?.user?.id;
        if (uid) {
          await queryClient.invalidateQueries({
            queryKey: profileQueryKey(uid),
          });
          await queryClient.invalidateQueries({
            queryKey: subscriptionDetailsQueryKey(uid),
          });
        }
        const nextHref =
          returnTo === "subscriptions"
            ? "/(logged-in)/subscriptions"
            : returnTo === "settings"
              ? "/(logged-in)/settings"
              : "/(logged-in)/welcome-to-pro";
        router.replace(nextHref as Href);
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
  }, [phase, queryClient, router, returnTo]);

  const retry = useCallback(() => {
    if (purchasedRef.current) {
      setPhase("confirming");
    } else {
      void startPurchase();
    }
  }, [startPurchase]);

  const onRestore = useCallback(async () => {
    setRestoring(true);
    setErrorMessage(null);
    try {
      const result = await restoreProPurchases();
      if (!result.hasCrittrPro) {
        Alert.alert(
          "Nothing to restore",
          "We couldn't find an active Crittr Pro subscription on this account. If you recently subscribed, try signing in to the same Apple ID or Google account used for the original purchase.",
        );
        return;
      }
      setPhase("confirming");
    } catch (e) {
      if (e instanceof ProPurchaseException && e.userCancelled) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Restore failed", msg);
    } finally {
      setRestoring(false);
    }
  }, []);

  const onPromoCode = useCallback(async () => {
    if (Platform.OS !== "ios") return;
    try {
      await Purchases.presentCodeRedemptionSheet();
    } catch (e) {
      if (__DEV__) console.warn("[pro-checkout] redeem code", e);
    }
  }, []);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const trialSubline = useMemo(() => {
    return billing === "annual"
      ? `${pricing.annual.formatted}/yr after your 7-day free trial`
      : `${pricing.monthly.formatted}/mo after your 7-day free trial`;
  }, [billing, pricing]);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {phase === "preflight" || phase === "loading" ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.hint}>Opening secure checkout…</Text>
        </View>
      ) : null}

      {phase === "confirming" ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.hint}>Activating Crittr Pro…</Text>
        </View>
      ) : null}

      {phase === "dismissed" ? (
        <View style={styles.centered}>
          <Text style={styles.title}>Ready to checkout?</Text>
          <Text style={styles.sub}>{trialSubline}</Text>
          <View style={styles.actions}>
            <OrangeButton onPress={() => void startPurchase()}>
              Open payment screen
            </OrangeButton>
            <Pressable
              style={styles.secondaryBtn}
              onPress={onRestore}
              disabled={restoring}
              accessibilityRole="button"
              accessibilityLabel="Restore previous purchases"
            >
              <Text style={styles.secondaryLabel}>
                {restoring ? "Restoring…" : "Restore purchases"}
              </Text>
            </Pressable>
            {Platform.OS === "ios" ? (
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => void onPromoCode()}
                accessibilityRole="button"
                accessibilityLabel="Redeem a promo code"
              >
                <Text style={styles.secondaryLabel}>Redeem promo code</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.secondaryBtn}
              onPress={goBack}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Go back to dashboard</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {phase === "error" && errorMessage ? (
        <View style={styles.centered}>
          <Text style={styles.err}>{errorMessage}</Text>
          <View style={styles.actions}>
            <OrangeButton onPress={retry}>
              {purchasedRef.current ? "Retry activation" : "Try again"}
            </OrangeButton>
            <Pressable
              style={styles.secondaryBtn}
              onPress={onRestore}
              disabled={restoring}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>
                {restoring ? "Restoring…" : "Restore purchases"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondaryBtn}
              onPress={goBack}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Go back to dashboard</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
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
