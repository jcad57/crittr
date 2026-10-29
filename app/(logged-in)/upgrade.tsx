import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Purchases from "react-native-purchases";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { ProTierCard } from "@/components/screens/upgrade/ProTierCard";
import { ProFlowPage, ProLink, ProNotice, getFlowStyles } from "@/components/pro/flow/ProFlowUi";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { useProPricingQuery } from "@/hooks/queries";
import { trackPaywallViewed } from "@/lib/analytics";
import { detectExistingCrittrProEntitlement } from "@/lib/iap/checkout";
import { clientHasUnlockedPro } from "@/lib/iap/crittrProClientState";
import { PLAY_REDEEM_URL } from "@/lib/iap/storeTerms";
import { suppressProCelebrationsUntil } from "@/lib/proEngagementPersistence";
import { useAuthStore } from "@/stores/authStore";
import { sessionGeneration } from "@/lib/sessionGeneration";
import { useThemeColors, useThemeValues } from "@/theme/colors";

export default function UpgradeScreen() {
  const Colors = useThemeColors();
  const flowStyles = useThemeValues(getFlowStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ fromOnboarding?: string; returnTo?: string; billing?: string; source?: string }>();
  const [billing, setBilling] = useState<"annual" | "monthly">(params.billing === "monthly" ? "monthly" : "annual");
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [promoError, setPromoError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pricingQuery = useProPricingQuery();
  const pricing = pricingQuery.data ?? PRO_PRICING_FALLBACK;
  const returnTo = params.returnTo;
  const fromOnboarding = params.fromOnboarding === "1" || params.fromOnboarding === "true";

  useEffect(() => {
    trackPaywallViewed({ billing, source: params.source === "website" ? "website" : fromOnboarding ? "onboarding" : returnTo || "upgrade" });
    const generation = sessionGeneration();
    let active = true;
    mounted.current = true;
    if (clientHasUnlockedPro()) {
      router.replace({ pathname: "/(logged-in)/pro-checkout", params: { billing, action: "check", ...(returnTo ? { returnTo } : {}) } });
      return () => { active = false; mounted.current = false; };
    }
    void detectExistingCrittrProEntitlement().then((result) => {
      if (!active || !mounted.current || generation !== sessionGeneration() || !result.hasCrittrPro) return;
      router.replace({ pathname: "/(logged-in)/pro-checkout", params: { billing, action: "check", ...(returnTo ? { returnTo } : {}) } });
    }).catch(() => { /* A failed preflight must not prevent reviewing plans. */ })
      .finally(() => { if (active && mounted.current) setCheckingExisting(false); });
    return () => { active = false; mounted.current = false; };
    // Capture this visit's intent once; toggling a plan must not repeat preflight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = useCallback(() => {
    const uid = useAuthStore.getState().session?.user?.id;
    if (fromOnboarding && uid) void suppressProCelebrationsUntil(uid, Date.now() + 24 * 60 * 60 * 1000).catch(() => {});
    if (!fromOnboarding && router.canGoBack()) router.back();
    else router.replace("/(logged-in)/(tabs)/dashboard");
  }, [fromOnboarding, router]);

  const checkout = (action?: "restore") => router.replace({ pathname: "/(logged-in)/pro-checkout", params: { billing, ...(returnTo ? { returnTo } : {}), ...(action ? { action } : {}) } });
  const onPromo = async () => {
    const generation = sessionGeneration();
    setPromoError(null);
    try {
      if (Platform.OS === "ios") await Purchases.presentCodeRedemptionSheet();
      else await WebBrowser.openBrowserAsync(PLAY_REDEEM_URL);
      if (!mounted.current || generation !== sessionGeneration()) return;
      const found = await detectExistingCrittrProEntitlement();
      if (mounted.current && generation === sessionGeneration() && found.hasCrittrPro) router.replace({ pathname: "/(logged-in)/pro-checkout", params: { billing, action: "check", ...(returnTo ? { returnTo } : {}) } });
    } catch {
      if (mounted.current) setPromoError("We couldn’t open code redemption. Check your connection and try again.");
    }
  };
  return <ProFlowPage showPurchaseEnvironment onBack={leave} compactFooter footer={<>
    {promoError ? <ProNotice message={promoError} /> : null}
    <OrangeButton onPress={() => checkout()} disabled={!pricing.resolved || checkingExisting} loading={checkingExisting}>{pricing.resolved ? `Continue with ${billing}` : "Loading prices…"}</OrangeButton>
    <Text style={[flowStyles.finePrint, { fontSize: 11, lineHeight: 14 }]}>{pricing.resolved && pricing[billing].trial ? `${pricing[billing].trial?.durationLabel} free trial, then ${pricing[billing].formatted}/${billing === "annual" ? "year" : "month"}. ` : `Billed ${billing === "annual" ? "annually" : "monthly"}. `}Cancel anytime.</Text>
    <View style={{ flexDirection: "row", justifyContent: "center", flexWrap: "wrap" }}><ProLink compact onPress={() => checkout("restore")}>Restore purchases</ProLink><ProLink compact onPress={() => router.push("/(logged-in)/terms-of-service")}>Terms</ProLink><ProLink compact onPress={() => router.push("/(logged-in)/privacy-policy")}>Privacy</ProLink><ProLink compact onPress={() => void onPromo()}>Redeem code</ProLink></View>
  </>} refreshing={checkingExisting ? <ActivityIndicator size="small" color={Colors.orange} /> : undefined}>
    <ProTierCard pricing={pricing} billing={billing} onBillingChange={setBilling} onCta={() => checkout()} busy={checkingExisting} showCta={false} />
    {!pricing.resolved && !pricingQuery.isFetching ? <View style={{ marginTop: 12, gap: 4 }}><ProNotice title="Prices aren’t available yet" message="Connect to the store to load current prices and any trial you’re eligible for." tone="info" /><ProLink onPress={() => void pricingQuery.refetch()}>Reload prices</ProLink></View> : null}
  </ProFlowPage>;
}
