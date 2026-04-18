import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { Font } from "@/constants/typography";
import { useAuth } from "@/context/auth";
import { useAuthStore } from "@/stores/authStore";
import { useProPricingQuery } from "@/hooks/queries";
import {
  profileQueryKey,
  subscriptionDetailsQueryKey,
} from "@/hooks/queries/queryKeys";
import { syncCrittrProAfterCheckout } from "@/lib/crittrProEntitlementSync";
import {
  fetchIntroTrialEligibility,
  fetchSubscriptionPaymentSheetParams,
  waitForProActivation,
  type ProBillingParam,
} from "@/lib/stripeCheckout";
import { useStripe } from "@stripe/stripe-react-native";
import { useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatDueToday(cents: number | null, currency: string | null): string | null {
  if (cents == null || currency == null || currency.length === 0) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return null;
  }
}

type Phase =
  | "preflight"
  | "loading"
  | "ready"
  | "dismissed"
  | "resume_payment_review"
  | "confirming"
  | "error";

export default function ProCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { billing: billingParam, returnTo, promo: promoParam, billingAnchor } =
    useLocalSearchParams<{
      billing?: string;
      returnTo?: string;
      promo?: string;
      billingAnchor?: string;
    }>();

  const billing: ProBillingParam =
    billingParam === "annual" ? "annual" : "monthly";

  const billingAnchorYmd =
    typeof billingAnchor === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(billingAnchor.trim())
      ? billingAnchor.trim()
      : undefined;

  const { data: pricingData } = useProPricingQuery();
  const pricing = pricingData ?? PRO_PRICING_FALLBACK;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const initRef = useRef(initPaymentSheet);
  initRef.current = initPaymentSheet;
  const presentRef = useRef(presentPaymentSheet);
  presentRef.current = presentPaymentSheet;

  const [phase, setPhase] = useState<Phase>("preflight");
  const [promotionCode, setPromotionCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /** null = preview loading; updated from Edge preview + checkout response. */
  const [eligibleForIntroTrial, setEligibleForIntroTrial] = useState<
    boolean | null
  >(null);
  const [paymentDone, setPaymentDone] = useState(false);
  /** From last successful `prepare()` — reflects promo (e.g. $0 for 100% off). */
  const [dueTodayLabel, setDueTodayLabel] = useState<string | null>(null);
  /** Stripe default PM label when re-subscribing after cancel-at-period-end. */
  const [resumePaymentMethodLabel, setResumePaymentMethodLabel] = useState<
    string | null
  >(null);
  const sheetReadyRef = useRef(false);
  /** Subscription created by Edge Function for the active PaymentSheet (webhook sync fallback). */
  const lastSubscriptionIdRef = useRef<string | null>(null);
  /** Promo string used for the last successful `prepare()` (for re-presenting sheet). */
  const lastPreparedPromoRef = useRef<string | null>(null);
  const promoSeededRef = useRef(false);

  useEffect(() => {
    if (promoSeededRef.current) return;
    const p = typeof promoParam === "string" ? promoParam.trim() : "";
    if (p) {
      setPromotionCode(p);
      promoSeededRef.current = true;
    }
  }, [promoParam]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ok = await fetchIntroTrialEligibility(billing);
        if (!cancelled) setEligibleForIntroTrial(ok);
      } catch {
        if (!cancelled) setEligibleForIntroTrial(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billing]);

  const finalizeResumeSubscription = useCallback(
    async (opts?: { finalizeResumeSetupIntentId?: string }) => {
      setPhase("loading");
      setErrorMessage(null);
      try {
        const params = await fetchSubscriptionPaymentSheetParams(
          billing,
          promotionCode,
          billingAnchorYmd,
          {
            confirmSubscriptionResume: true,
            finalizeResumeSetupIntentId: opts?.finalizeResumeSetupIntentId,
          },
        );
        lastSubscriptionIdRef.current = params.subscriptionId;
        if (!params.resumed) {
          throw new Error("Could not complete subscription resume.");
        }
        const cur =
          typeof params.currency === "string" ? params.currency : "usd";
        const cents =
          typeof params.amountDueCents === "number" ? params.amountDueCents : 0;
        setDueTodayLabel(formatDueToday(cents, cur));
        void syncCrittrProAfterCheckout(params.subscriptionId);
        setPaymentDone(true);
        setPhase("confirming");
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : "Something went wrong");
        setPhase("error");
      }
    },
    [billing, billingAnchorYmd, promotionCode],
  );

  const continueResumeWithCardOnFile = useCallback(() => {
    void finalizeResumeSubscription();
  }, [finalizeResumeSubscription]);

  const startUseDifferentCardForResume = useCallback(async () => {
    setPhase("loading");
    setErrorMessage(null);
    try {
      const p = await fetchSubscriptionPaymentSheetParams(
        billing,
        promotionCode,
        billingAnchorYmd,
        { createResumeCardSetupIntent: true },
      );
      if (!p.setupIntentClientSecret) {
        throw new Error("Could not start card update.");
      }
      const base = {
        merchantDisplayName: "Crittr",
        customerId: p.customerId,
        customerEphemeralKeySecret: p.ephemeralKey,
        allowsDelayedPaymentMethods: true,
        returnURL: "crittr://stripe-redirect",
      } as const;
      const initResult = await initRef.current({
        ...base,
        setupIntentClientSecret: p.setupIntentClientSecret,
      });
      if ("error" in initResult && initResult.error) {
        throw new Error(initResult.error.message);
      }
      const { error: presentError } = await presentRef.current();
      if (presentError) {
        if (presentError.code === "Canceled") {
          setPhase("resume_payment_review");
          return;
        }
        throw new Error(presentError.message);
      }
      const sid = p.setupIntentId;
      if (!sid || typeof sid !== "string") {
        throw new Error("Missing setup confirmation. Try again.");
      }
      await finalizeResumeSubscription({
        finalizeResumeSetupIntentId: sid,
      });
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }, [billing, billingAnchorYmd, promotionCode, finalizeResumeSubscription]);

  // ── Step 1: fetch params + init PaymentSheet ────────────────────────
  const prepare = useCallback(async () => {
    setPhase("loading");
    setErrorMessage(null);
    setPaymentDone(false);
    setDueTodayLabel(null);
    setResumePaymentMethodLabel(null);
    sheetReadyRef.current = false;
    lastSubscriptionIdRef.current = null;

    try {
      if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error(
          "Stripe is not configured. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment.",
        );
      }

      const params = await fetchSubscriptionPaymentSheetParams(
        billing,
        promotionCode,
        billingAnchorYmd,
      );
      lastSubscriptionIdRef.current = params.subscriptionId;

      if (typeof params.introTrialApplied === "boolean") {
        setEligibleForIntroTrial(params.introTrialApplied);
      }

      if (params.resumePaymentReview) {
        sheetReadyRef.current = false;
        const label =
          params.paymentMethodLabel == null
            ? null
            : String(params.paymentMethodLabel);
        setResumePaymentMethodLabel(label);
        setPhase("resume_payment_review");
        return;
      }

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
      lastPreparedPromoRef.current = promotionCode.trim();
      const cents =
        typeof params.amountDueCents === "number" ? params.amountDueCents : null;
      const cur =
        typeof params.currency === "string" ? params.currency : null;
      setDueTodayLabel(formatDueToday(cents, cur));
      setPhase("ready");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }, [billing, billingAnchorYmd, promotionCode]);

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

  const openOrRefreshCheckout = useCallback(async () => {
    const code = promotionCode.trim();
    if (
      sheetReadyRef.current &&
      code === (lastPreparedPromoRef.current ?? "")
    ) {
      await openPaymentSheet();
      return;
    }
    await prepare();
  }, [promotionCode, prepare, openPaymentSheet]);

  // ── Confirm Pro status via DB poll ──────────────────────────────────
  useEffect(() => {
    if (phase !== "confirming") return;
    let cancelled = false;

    void (async () => {
      try {
        await waitForProActivation(28_000, {
          subscriptionId: lastSubscriptionIdRef.current,
        });
        if (cancelled) return;

        const uid =
          useAuthStore.getState().session?.user?.id ?? session?.user?.id;
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
            : returnTo === "billing"
              ? "/(logged-in)/billing"
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
  }, [phase, queryClient, router, returnTo, session?.user?.id]);

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

  const trialSubline = useMemo(() => {
    if (billingAnchorYmd) {
      return `Billing is timed to follow your current access (through ${billingAnchorYmd}).`;
    }
    if (eligibleForIntroTrial === false) {
      return billing === "annual"
        ? `${pricing.annual.formatted}/yr — first charge when you finish payment. Your account already used the free intro trial.`
        : `${pricing.monthly.formatted}/mo — first charge when you finish payment. Your account already used the free intro trial.`;
    }
    return billing === "annual"
      ? `${pricing.annual.formatted}/yr after your 7-day free trial`
      : `${pricing.monthly.formatted}/mo after your 7-day free trial`;
  }, [billing, billingAnchorYmd, eligibleForIntroTrial, pricing]);

  const dueTodayRow =
    dueTodayLabel != null ? (
      <Text style={styles.dueToday}>Due today: {dueTodayLabel}</Text>
    ) : null;

  const promoField = (
    <TextInput
      value={promotionCode}
      onChangeText={setPromotionCode}
      placeholder="Promo code (optional)"
      placeholderTextColor={Colors.gray400}
      autoCapitalize="none"
      autoCorrect={false}
      editable={
        phase !== "loading" &&
        phase !== "confirming" &&
        phase !== "resume_payment_review"
      }
      style={styles.promoInput}
      accessibilityLabel="Promo code"
    />
  );

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 24 },
      ]}
    >
      {phase === "preflight" && (
        <View style={styles.centered}>
          <Text style={styles.title}>Crittr Pro checkout</Text>
          <Text style={styles.sub}>{trialSubline}</Text>
          {dueTodayRow}
          {promoField}
          <View style={styles.actions}>
            <OrangeButton onPress={() => void prepare()}>
              Continue to payment
            </OrangeButton>
            <Pressable
              style={styles.secondaryBtn}
              onPress={goBack}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Go back</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ── Loading: centered spinner ─────────────────────────────── */}
      {phase === "loading" && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
          <Text style={styles.hint}>Getting your payment ready…</Text>
        </View>
      )}

      {phase === "resume_payment_review" && (
        <View style={styles.centered}>
          <Text style={styles.title}>Confirm payment</Text>
          <Text style={styles.sub}>
            {resumePaymentMethodLabel
              ? `Your plan will renew using this card on file with Stripe: ${resumePaymentMethodLabel}. You can keep it or update it before we turn auto-renew back on.`
              : "We don't have a saved card on this subscription. Add a payment method in Stripe's secure form to continue."}
          </Text>
          <View style={styles.actions}>
            {resumePaymentMethodLabel ? (
              <OrangeButton onPress={continueResumeWithCardOnFile}>
                Continue with this card
              </OrangeButton>
            ) : (
              <OrangeButton onPress={() => void startUseDifferentCardForResume()}>
                Add payment method
              </OrangeButton>
            )}
            {resumePaymentMethodLabel ? (
              <Pressable
                onPress={() => void startUseDifferentCardForResume()}
                style={({ pressed }) => [
                  styles.resumeOutlineBtn,
                  pressed && styles.resumeOutlineBtnPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Use a different card"
              >
                <Text style={styles.resumeOutlineBtnText}>Use a different card</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.secondaryBtn}
              onPress={goBack}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryLabel}>Go back</Text>
            </Pressable>
          </View>
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
          <Text style={styles.sub}>{trialSubline}</Text>
          {dueTodayRow}
          {promoField}
          <View style={styles.actions}>
            <OrangeButton
              onPress={() => void openOrRefreshCheckout()}
              accessibilityHint="Opens payment, or refreshes checkout if you changed the promo code"
            >
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
          {!paymentDone ? dueTodayRow : null}
          {!paymentDone ? promoField : null}
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
  dueToday: {
    fontFamily: Font.uiMedium,
    fontSize: 17,
    lineHeight: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
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
  promoInput: {
    alignSelf: "stretch",
    width: "100%",
    maxWidth: 400,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  resumeOutlineBtn: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.orange,
    alignItems: "center",
  },
  resumeOutlineBtnPressed: { opacity: 0.85 },
  resumeOutlineBtnText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.orange,
  },
});
