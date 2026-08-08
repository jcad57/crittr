import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { Font } from "@/theme/typography";
import { useProPricingQuery } from "@/hooks/queries";
import {
  profileQueryKey,
  subscriptionDetailsQueryKey,
} from "@/hooks/queries/queryKeys";
import {
  ProPurchaseException,
  detectExistingCrittrProEntitlement,
  fetchProPackageForBillingDetailed,
  purchaseProPackage,
  restoreProPurchases,
  waitForProActivation,
  type OfferingFetchFailure,
  type ProBillingParam,
  type ProPurchaseResult,
} from "@/lib/iap/checkout";
import {
  PLAY_REDEEM_URL,
  storeAccountLabel,
  storePhrase,
} from "@/lib/iap/storeTerms";
import { useAuthStore } from "@/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
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
  /** Play accepted the order but it needs to clear (cash, carrier, approval). */
  | "pending"
  | "error";

/** User-facing copy for each `loadCurrentOffering` failure mode. Detail string is logged separately. */
function userFacingOfferingMessage(reason: OfferingFetchFailure): string {
  switch (reason) {
    case "rc_not_configured":
      return "Subscriptions aren't available in this build. Please update Crittr or contact support.";
    case "no_current_offering":
      return "Crittr Pro isn't available right now. Please try again in a minute or contact support if this persists.";
    case "package_missing":
      return "This subscription option isn't available right now. Please try the other plan or try again later.";
    case "billing_unavailable":
      return `Purchases aren't available on this device. Make sure you're signed in to ${storePhrase()} and that purchases aren't restricted for your ${storeAccountLabel()}.`;
    case "get_offerings_failed":
      return `We couldn't reach ${storePhrase()}. Please check your connection and try again.`;
  }
}

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
  const purchaseResultRef = useRef<ProPurchaseResult | null>(null);

  const startPurchase = useCallback(async () => {
    setPhase("loading");
    setErrorMessage(null);
    purchasedRef.current = false;

    try {
      /**
       * Short-circuit if RevenueCat already reports an active Crittr Pro
       * entitlement for this Apple/Google account. This is how we avoid
       * showing a paywall to a user who redeemed a promo code outside the
       * app (e.g. via App Store offer code link), or who has an existing
       * subscription tied to a different login on the same store account.
       *
       * Important: we treat this as a "restore"-style activation. We don't
       * want to charge the user a second time just because their Supabase
       * profile hadn't picked up the RC entitlement yet.
       */
      const existing = await detectExistingCrittrProEntitlement();
      if (existing.hasCrittrPro) {
        purchaseResultRef.current = {
          customerInfo: existing.customerInfo,
          productIdentifier: "",
          hasCrittrPro: true,
        };
        purchasedRef.current = true;
        setPhase("confirming");
        return;
      }

      const offering = await fetchProPackageForBillingDetailed(billing);
      if (!offering.ok) {
        const baseMsg = userFacingOfferingMessage(offering.reason);
        const msg =
          __DEV__ && offering.detail
            ? `${baseMsg}\n\n[debug] ${offering.reason}: ${offering.detail}`
            : baseMsg;
        console.warn(
          "[pro-checkout] offering unavailable:",
          offering.reason,
          offering.detail,
        );
        throw new Error(msg);
      }
      const result = await purchaseProPackage(offering.package);
      purchasedRef.current = true;
      purchaseResultRef.current = result;
      if (result.hasCrittrPro) {
        setPhase("confirming");
      } else {
        /** RC reported success without entitlement (e.g. unverified ask-to-buy); poll backend. */
        setPhase("confirming");
      }
    } catch (e) {
      if (e instanceof ProPurchaseException) {
        if (e.kind === "cancelled") {
          setPhase("dismissed");
          return;
        }
        /**
         * Play can accept an order that settles later, and it can reject a
         * repeat purchase for a product the account already owns. Neither is
         * a failed checkout, and in both cases charging again is the wrong
         * move — activate or wait instead.
         */
        if (e.kind === "pending") {
          setErrorMessage(e.message);
          setPhase("pending");
          return;
        }
        if (e.kind === "already_owned") {
          purchasedRef.current = true;
          setPhase("confirming");
          return;
        }
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
        /**
         * The fast post-purchase path only applies when the store just handed
         * us a receipt. Everything else that lands here — the
         * existing-entitlement short-circuit, `restorePurchases`, or Play
         * rejecting a repeat buy for a product the account already owns —
         * needs the backend's long-poll patience budget instead.
         */
        const cachedResult = purchaseResultRef.current;
        const source =
          cachedResult && cachedResult.productIdentifier !== ""
            ? ("purchase" as const)
            : ("restore" as const);
        await waitForProActivation(75_000, {
          purchaseCustomerInfo: cachedResult?.customerInfo,
          source,
        });
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
          `We couldn't find an active Crittr Pro subscription on this account. If you recently subscribed, make sure this device is signed in to the ${storeAccountLabel()} used for the original purchase.`,
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
    try {
      if (Platform.OS === "ios") {
        await Purchases.presentCodeRedemptionSheet();
        return;
      }
      await WebBrowser.openBrowserAsync(PLAY_REDEEM_URL);
    } catch (e) {
      if (__DEV__) console.warn("[pro-checkout] redeem code", e);
    }
  }, []);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const trialSubline = useMemo(() => {
    const tier = billing === "annual" ? pricing.annual : pricing.monthly;
    const cadence = billing === "annual" ? "yr" : "mo";
    return tier.trial
      ? `${tier.formatted}/${cadence} after your ${tier.trial.durationLabel} free trial`
      : `${tier.formatted}/${cadence} · Cancel anytime`;
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

      {phase === "pending" ? (
        <View style={styles.centered}>
          <Text style={styles.title}>Payment in progress</Text>
          <Text style={styles.sub}>{errorMessage}</Text>
          <View style={styles.actions}>
            <OrangeButton onPress={goBack}>Back to dashboard</OrangeButton>
          </View>
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
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void onPromoCode()}
              accessibilityRole="button"
              accessibilityLabel="Redeem a promo code"
            >
              <Text style={styles.secondaryLabel}>Redeem promo code</Text>
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
