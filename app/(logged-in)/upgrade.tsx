import { ProTierCard } from "@/components/screens/upgrade/ProTierCard";
import { Colors } from "@/constants/colors";
import { PRO_PRICING_FALLBACK } from "@/constants/proPricingFallback";
import { useProPricingQuery } from "@/hooks/queries";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { fetchIntroTrialEligibility } from "@/lib/stripeCheckout";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/upgrade.styles";

type BillingPeriod = "annual" | "monthly";

export default function UpgradeScreen() {
  const router = useRouter();
  const { push, replace } = useNavigationCooldown();
  const refreshProfileOnly = useAuthStore((s) => s.refreshProfileOnly);
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const [billing, setBilling] = useState<BillingPeriod>("annual");
  const [introTrialEligible, setIntroTrialEligible] = useState<boolean | null>(
    null,
  );
  const params = useLocalSearchParams<{
    fromOnboarding?: string;
    returnTo?: string;
    /** YYYY-MM-DD — aligns checkout trial end with existing cancel-at-period-end access. */
    billingAnchor?: string;
  }>();
  const fromOnboarding =
    params.fromOnboarding === "1" || params.fromOnboarding === "true";

  const { data: pricingData } = useProPricingQuery();
  const pricing = pricingData ?? PRO_PRICING_FALLBACK;

  const billingAnchorActive = useMemo(() => {
    const a =
      typeof params.billingAnchor === "string"
        ? params.billingAnchor.trim()
        : "";
    return /^\d{4}-\d{2}-\d{2}$/.test(a);
  }, [params.billingAnchor]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ok = await fetchIntroTrialEligibility(billing);
        if (!cancelled) setIntroTrialEligible(ok);
      } catch {
        if (!cancelled) setIntroTrialEligible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billing]);

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
          billingAnchorActive={billingAnchorActive}
          introTrialEligible={introTrialEligible}
          onCta={() => {
            const q = new URLSearchParams();
            q.set("billing", billing);
            if (params.returnTo) q.set("returnTo", params.returnTo);
            const anchor =
              typeof params.billingAnchor === "string"
                ? params.billingAnchor.trim()
                : "";
            if (/^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
              q.set("billingAnchor", anchor);
            }
            push(`/(logged-in)/pro-checkout?${q.toString()}` as Href);
          }}
          showNoThanks={fromOnboarding}
          onNoThanks={goToDashboard}
        />
      </ScrollView>
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
