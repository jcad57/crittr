import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { ProActivationView } from "@/components/pro/flow/ProActivationView";
import { ProRecoveryView } from "@/components/pro/flow/ProRecoveryView";
import { OrganicSurface, ProFlowPage, ProIllustration, ProLink, ProNotice, ProOutlineButton, getProFlowBenefits, getFlowStyles } from "@/components/pro/flow/ProFlowUi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { useProPricingQuery } from "@/hooks/queries";
import { detectExistingCrittrProEntitlement, fetchProPackageForBillingDetailed, purchaseProPackage, getOutstandingProPurchase, restoreProPurchases, waitForProActivation } from "@/lib/iap/checkout";
import { withTimeout } from "@/lib/iap/withTimeout";
import { createProPurchaseFlow } from "@/lib/iap/proPurchaseFlow";
import { PRO_ACTIVATION_UI_WATCHDOG_MS } from "@/lib/iap/proActivation";
import { clientHasUnlockedPro } from "@/lib/iap/crittrProClientState";
import { storeLabel } from "@/lib/iap/storeTerms";
import { fetchProTrialForPackage } from "@/services/proPricing";
import { profileQueryKey, subscriptionDetailsQueryKey, proPricingQueryKey } from "@/lib/query/keys";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { useAuthStore } from "@/stores/authStore";
import { postPurchaseHref, proWelcomeHref } from "@/utils/proUpgradePaths";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";

export default function ProCheckoutScreen() {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const PRO_FLOW_BENEFITS = useThemeValues(getProFlowBenefits);
  const flowStyles = useThemeValues(getFlowStyles);
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ billing?: string; returnTo?: string; action?: string }>();
  const billing = params.billing === "monthly" ? "monthly" : "annual";
  const pricingQuery = useProPricingQuery();
  const pricing = pricingQuery.data ?? PRO_PRICING_FALLBACK;
  const tier = pricing[billing];
  const [flow] = useState(() => createProPurchaseFlow({
    sessionKey: () => `${useAuthStore.getState().session?.user?.id ?? ""}:${sessionGeneration()}`,
    detect: () => detectExistingCrittrProEntitlement({ strict: true }),
    offering: fetchProPackageForBillingDetailed,
    trial: fetchProTrialForPackage,
    purchase: purchaseProPackage,
    outstandingPurchase: getOutstandingProPurchase,
    restore: async () => {
      const result = await withTimeout(restoreProPurchases(), 15_000);
      if (!result) throw new Error("Restoring is taking longer than expected. Check your connection and try again. Restoring won’t charge you.");
      return result;
    },
    verify: (result, source, signal) => waitForProActivation({ purchaseCustomerInfo: result?.customerInfo, source, signal, timeoutMs: PRO_ACTIVATION_UI_WATCHDOG_MS }),
    hasVerifiedAccess: clientHasUnlockedPro,
    pricesChanged: () => { void queryClient.invalidateQueries({ queryKey: proPricingQueryKey }); },
    pause: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    storeName: storeLabel(),
  }));
  const state = useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot);
  const navigated = useRef(false);

  useEffect(() => {
    let active = true;
    // Defer native restore until mount settles (including React's strict-effect probe).
    void Promise.resolve().then(() => {
      if (!active) return;
      if (getOutstandingProPurchase()) void flow.resumeOutstanding();
      else if (params.action === "restore") void flow.restore();
      else if (params.action === "check") void flow.check();
      else if (params.action === "recover") flow.showRecovery();
    });
    return () => { active = false; flow.cancel(); };
    // This action belongs to the route visit, not to later query updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow]);

  useEffect(() => {
    if (state.phase !== "complete" || navigated.current) return;
    navigated.current = true;
    const uid = useAuthStore.getState().session?.user?.id;
    if (uid) {
      void queryClient.invalidateQueries({ queryKey: profileQueryKey(uid) });
      void queryClient.invalidateQueries({ queryKey: subscriptionDetailsQueryKey(uid) });
      void useAuthStore.getState().refreshProfileOnly().catch(() => {});
    }
    void queryClient.invalidateQueries({ queryKey: proPricingQueryKey });
    router.replace(state.source === "purchase" ? proWelcomeHref(params.returnTo) : postPurchaseHref(params.returnTo));
  }, [state.phase, state.source, params.returnTo, router, queryClient]);

  useEffect(() => {
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && previous !== "active") flow.onAppActive();
      previous = next;
    });
    return () => subscription.remove();
  }, [flow]);

  const exit = useCallback(() => router.replace("/(logged-in)/(tabs)/dashboard"), [router]);
  const changePlan = () => {
    if (state.working) return;
    router.replace({ pathname: "/(logged-in)/upgrade", params: { billing, ...(params.returnTo ? { returnTo: params.returnTo } : {}) } });
  };
  const subscribe = () => {
    if (!pricing.resolved) return;
    void flow.purchase({ billing, productId: tier.priceId, amount: tier.unitAmount, currency: tier.currency, trial: tier.trial });
  };

  if (state.phase === "activating" || state.phase === "complete") return <ProFlowPage showPurchaseEnvironment onBack={exit}><ProActivationView stage={state.activationStage} restored={state.source !== "purchase"} /></ProFlowPage>;
  if (state.phase === "pending" || state.phase === "recovery") return <ProFlowPage showPurchaseEnvironment onBack={exit} brand={false}>
    <ProRecoveryView pending={state.phase === "pending"} confirmed={state.storeConfirmed} uncertain={state.purchaseUnresolved} nativeRequestPending={state.nativeRequestPending} reviewRequired={state.requiresPlanReview} purchaseFailed={state.source === "purchase" && !state.storeConfirmed} message={state.message} busy={state.working} onRetry={() => void flow.retry()} onRestore={() => void flow.restore()} onExit={exit} onChangePlan={changePlan} />
  </ProFlowPage>;
  if (state.phase === "purchasing" && state.source !== "purchase") return <ProFlowPage showPurchaseEnvironment onBack={exit}><View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 20 }}><ProIllustration kind="receipt" color={Colors.skyLight} height={220} /><Text style={[flowStyles.title, flowStyles.center]}>Finding your Pro access.</Text><Text style={[flowStyles.subtitle, flowStyles.center]}>Checking your purchases with {storeLabel()}…</Text><ActivityIndicator color={Colors.orange} /></View></ProFlowPage>;

  return <ProFlowPage showPurchaseEnvironment onBack={state.working ? undefined : changePlan} compactFooter footerContentStyle={{ gap: 8 }} footer={<>
    <OrangeButton onPress={subscribe} loading={state.working} disabled={!pricing.resolved}>
      {!pricing.resolved ? "Loading prices…" : tier.trial ? `Start ${tier.trial.durationLabel} free trial` : `Subscribe for ${tier.formatted}/${billing === "annual" ? "year" : "month"}`}
    </OrangeButton>
    <ProOutlineButton onPress={changePlan} disabled={state.working}>Change plan</ProOutlineButton>
  </>}>
    <ProIllustration height={screenHeight < 900 ? 105 : 160} />
    <Text style={[flowStyles.title, flowStyles.center, { marginTop: 14 }]}>Your care,{'\n'}upgraded.</Text>
    <Text style={[flowStyles.subtitle, flowStyles.center, { fontSize: 14, marginBottom: 14 }]}>More pets. More people. More peace of mind.</Text>
    <OrganicSurface color={Colors.featureDark} variant="hero" style={styles.summary}>
      <View style={styles.summaryTop}><View><Text style={styles.brandLight}>Crittr<Text style={{ color: Colors.orange }}> Pro</Text></Text><Text style={styles.plan}>{billing === "annual" ? "Annual" : "Monthly"} plan</Text></View><View style={{ alignItems: "flex-end", flexShrink: 1 }}><Text style={styles.summaryPrice}>{pricing.resolved ? `${tier.formatted} / ${billing === "annual" ? "year" : "month"}` : "Checking price…"}</Text>{billing === "annual" && pricing.resolved ? <Text style={styles.summaryMeta}>{pricing.annual.equivalentMonthlyFormatted} / month</Text> : null}</View></View>
      {PRO_FLOW_BENEFITS.map((b) => <View key={b.title} style={styles.feature}><MaterialCommunityIcons name={b.icon} size={19} color="#F3C36A" /><Text style={styles.featureText}>{b.title}</Text></View>)}
    </OrganicSurface>
    <View style={styles.due}><View style={styles.dueTop}><Text style={styles.dueTitle}>Due today</Text><Text style={styles.dueTitle}>{pricing.resolved ? tier.trial ? new Intl.NumberFormat(undefined, { style: "currency", currency: tier.currency }).format(0) : tier.formatted : "—"}</Text></View><Text style={styles.dueBody}>{tier.trial && pricing.resolved ? `${tier.trial.durationLabel} free, then ${tier.formatted}/${billing === "annual" ? "year" : "month"}. ` : ""}Renews {billing === "annual" ? "yearly" : "monthly"} until cancelled.</Text></View>
    {!pricing.resolved && !pricingQuery.isFetching ? <><ProNotice tone="info" message="We couldn’t load current store pricing. Reload prices before subscribing." /><ProLink onPress={() => void pricingQuery.refetch()}>Reload prices</ProLink></> : null}
  </ProFlowPage>;
}
const getStyles = createThemeValues((Colors) => StyleSheet.create({
  summary: { padding: 18, paddingTop: 35, paddingBottom: 27, marginTop: 4, gap: 9 }, summaryTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 3 },
  brandLight: { fontFamily: Font.displayBold, color: Colors.warmWhite, fontSize: 25 }, plan: { fontFamily: Font.uiRegular, color: "#E5E0D8", fontSize: 15, marginTop: 2 },
  summaryPrice: { fontFamily: Font.uiBold, color: Colors.warmWhite, fontSize: 15, marginTop: 5 }, summaryMeta: { fontFamily: Font.uiRegular, color: "#C7C1BA", fontSize: 12, marginTop: 5 },
  feature: { flexDirection: "row", alignItems: "center", gap: 12 }, featureText: { fontFamily: Font.uiRegular, fontSize: 14, color: Colors.warmWhite, flex: 1 },
  due: { backgroundColor: "#F0ECE3", borderRadius: 20, padding: 16, marginTop: 14, marginBottom: 6 }, dueTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  dueTitle: { fontFamily: Font.uiBold, fontSize: 16, color: Colors.textPrimary }, dueBody: { fontFamily: Font.uiRegular, fontSize: 12, lineHeight: 18, color: "#66665F", marginTop: 4 },
}));
