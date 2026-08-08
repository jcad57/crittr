import { ProTierCard } from "@/components/screens/upgrade/ProTierCard";
import { Colors } from "@/theme/colors";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { useProPricingQuery } from "@/hooks/queries";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import {
  detectExistingCrittrProEntitlement,
  ProPurchaseException,
  restoreProPurchases,
  waitForProActivation,
} from "@/lib/iap/checkout";
import { PLAY_REDEEM_URL, storeAccountLabel } from "@/lib/iap/storeTerms";
import { useAuthStore } from "@/stores/authStore";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/upgrade.styles";

type BillingPeriod = "annual" | "monthly";

export default function UpgradeScreen() {
  const router = useRouter();
  const { push, replace } = useNavigationCooldown();
  const refreshProfileOnly = useAuthStore((s) => s.refreshProfileOnly);
  const profile = useAuthStore((s) => s.profile);
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const [billing, setBilling] = useState<BillingPeriod>("annual");
  const [activatingExisting, setActivatingExisting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const params = useLocalSearchParams<{
    fromOnboarding?: string;
    returnTo?: string;
  }>();
  const fromOnboarding =
    params.fromOnboarding === "1" || params.fromOnboarding === "true";

  const { data: pricingData } = useProPricingQuery();
  const pricing = pricingData ?? PRO_PRICING_FALLBACK;

  /**
   * Promo / restore short-circuit: if RC already reports active Crittr Pro
   * on this device (offer code redeemed outside the app, prior subscription
   * still active on this Apple ID, etc.), skip the paywall and reconcile
   * with Supabase before sending the user to the welcome screen.
   */
  useEffect(() => {
    if (activatingExisting) return;
    if (isCrittrProFromProfile(profile)) return;
    let cancelled = false;
    void (async () => {
      try {
        const detect = await detectExistingCrittrProEntitlement();
        if (cancelled || !detect.hasCrittrPro) return;
        setActivatingExisting(true);
        try {
          await waitForProActivation(60_000, {
            purchaseCustomerInfo: detect.customerInfo,
            source: "restore",
          });
          if (cancelled) return;
          await refreshProfileOnly();
          if (cancelled) return;
          const nextHref =
            params.returnTo === "subscriptions"
              ? "/(logged-in)/subscriptions"
              : params.returnTo === "settings"
                ? "/(logged-in)/settings"
                : "/(logged-in)/welcome-to-pro";
          replace(nextHref as Href);
        } catch {
          /* fall through — the user can still tap "Restore purchases" manually. */
        } finally {
          if (!cancelled) setActivatingExisting(false);
        }
      } catch {
        /* SDK errors are non-fatal; the paywall just stays visible. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, params.returnTo, activatingExisting, refreshProfileOnly, replace]);

  const scrollCompact = windowH < 720;

  const goToDashboard = async () => {
    await refreshProfileOnly();
    replace("/(logged-in)/dashboard" as Href);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    void goToDashboard();
  };

  const onRestore = useCallback(async () => {
    if (restoring || activatingExisting) return;
    setRestoring(true);
    try {
      const result = await restoreProPurchases();
      if (!result.hasCrittrPro) {
        Alert.alert(
          "Nothing to restore",
          `We couldn't find an active Crittr Pro subscription on this account. If you recently subscribed, make sure this device is signed in to the ${storeAccountLabel()} used for the original purchase.`,
        );
        return;
      }
      setActivatingExisting(true);
      try {
        await waitForProActivation(60_000, {
          purchaseCustomerInfo: result.customerInfo,
          source: "restore",
        });
        await refreshProfileOnly();
        const nextHref =
          params.returnTo === "subscriptions"
            ? "/(logged-in)/subscriptions"
            : params.returnTo === "settings"
              ? "/(logged-in)/settings"
              : "/(logged-in)/welcome-to-pro";
        replace(nextHref as Href);
      } finally {
        setActivatingExisting(false);
      }
    } catch (e) {
      if (e instanceof ProPurchaseException && e.userCancelled) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Restore failed", msg);
    } finally {
      setRestoring(false);
    }
  }, [
    restoring,
    activatingExisting,
    refreshProfileOnly,
    params.returnTo,
    replace,
  ]);

  /**
   * `presentCodeRedemptionSheet` is iOS-only. Play has no in-app equivalent,
   * so Android users go to the Play redeem page; the entitlement lands back in
   * the app through the RevenueCat sync on resume.
   */
  const onPromoCode = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        await Purchases.presentCodeRedemptionSheet();
        return;
      }
      await WebBrowser.openBrowserAsync(PLAY_REDEEM_URL);
    } catch (e) {
      if (__DEV__) console.warn("[upgrade] redeem code", e);
    }
  }, []);

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={GRADIENT_LOCATIONS}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.gradient}
    >
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8, paddingHorizontal: 20 },
        ]}
      >
        <View style={styles.topBarInner}>
          <View style={styles.topTitleWrap} pointerEvents="none">
            <Text style={styles.topTierNameCentered} numberOfLines={1}>
              Crittr Pro
            </Text>
          </View>
          <View style={styles.topBarRow}>
            <Pressable
              style={styles.backInRow}
              onPress={handleBack}
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
            <View style={styles.goProInline}>
              <MaterialCommunityIcons
                name="star-four-points"
                size={14}
                color={Colors.orange}
              />
              <Text style={styles.goProInlineText}>Go Pro</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={[
          styles.cardScrollContent,
          {
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
          },
        ]}
        showsVerticalScrollIndicator={scrollCompact}
        bounces={scrollCompact}
      >
        <ProTierCard
          pricing={pricing}
          billing={billing}
          onBillingChange={setBilling}
          onCta={() => {
            const q = new URLSearchParams();
            q.set("billing", billing);
            if (params.returnTo) q.set("returnTo", params.returnTo);
            push(`/(logged-in)/pro-checkout?${q.toString()}` as Href);
          }}
          showNoThanks={fromOnboarding}
          onNoThanks={goToDashboard}
        />

        <View style={upgradeFooter.row}>
          <Pressable
            style={({ pressed }) => [
              upgradeFooter.linkBtn,
              pressed && upgradeFooter.linkBtnPressed,
            ]}
            onPress={onRestore}
            disabled={restoring || activatingExisting}
            accessibilityRole="button"
            accessibilityLabel="Restore previous purchases"
          >
            <Text style={upgradeFooter.linkText}>
              {restoring ? "Restoring…" : "Restore purchases"}
            </Text>
          </Pressable>
          <Text style={upgradeFooter.dot}>·</Text>
          <Pressable
            style={({ pressed }) => [
              upgradeFooter.linkBtn,
              pressed && upgradeFooter.linkBtnPressed,
            ]}
            onPress={() => void onPromoCode()}
            disabled={activatingExisting}
            accessibilityRole="button"
            accessibilityLabel="Redeem a promo code"
          >
            <Text style={upgradeFooter.linkText}>Redeem promo code</Text>
          </Pressable>
        </View>
      </ScrollView>

      {activatingExisting ? (
        <View style={upgradeFooter.activatingOverlay} pointerEvents="auto">
          <View style={upgradeFooter.activatingCard}>
            <ActivityIndicator color={Colors.orange} />
            <Text style={upgradeFooter.activatingText}>
              Activating Crittr Pro…
            </Text>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

/**
 * Neutral black/grey wash — same luminance steps as before, no blue slate undertone.
 */
const GRADIENT_COLORS = [
  "#0f0f0f",
  "#171717",
  "#1a1a1a",
  "#2e2d2d", // mid “lift” band (neutral grey)
  "#1a1a1a",
  "#171717",
  "#0f0f0f",
] as const;

const GRADIENT_LOCATIONS = [0, 0.15, 0.35, 0.52, 0.68, 0.86, 1] as const;

const upgradeFooter = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 18,
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  linkBtnPressed: {
    opacity: 0.6,
  },
  linkText: {
    color: "#f5f5f7",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  dot: {
    color: "#9a9a9c",
    fontSize: 14,
  },
  activatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  activatingCard: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    minWidth: 220,
  },
  activatingText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111",
  },
});
