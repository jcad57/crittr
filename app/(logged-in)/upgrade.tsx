import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BillingPeriod = "annual" | "monthly";

type CellDisplay = "check" | "x" | "pill";

type CompareRow = {
  title: string;
  subtitle?: string;
  free: { type: CellDisplay; label?: string };
  pro: { type: CellDisplay; label?: string };
};

/** Aligned with `Context Files/CrittrPro.md` */
const COMPARISON_ROWS: CompareRow[] = [
  {
    title: "Pets",
    subtitle: "Companions you manage",
    free: { type: "pill", label: "1" },
    pro: { type: "pill", label: "Unlimited" },
  },
  {
    title: "Meals, treats & meds",
    subtitle: "Food, treats, medications, vaccinations",
    free: { type: "pill", label: "1 each" },
    pro: { type: "pill", label: "Unlimited" },
  },
  {
    title: "Activity logs",
    subtitle: "Walks, play, notes",
    free: { type: "check" },
    pro: { type: "check" },
  },
  {
    title: "Full pet profile",
    subtitle: "Details and history",
    free: { type: "check" },
    pro: { type: "check" },
  },
  {
    title: "Upload pet records",
    subtitle: "Documents and files",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "Co-care",
    subtitle: "Share care with others",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "CrittrAI",
    subtitle: "Smart assistance",
    free: { type: "x" },
    pro: { type: "check" },
  },
  {
    title: "Notifications & reminders",
    subtitle: "Stay on schedule",
    free: { type: "x" },
    pro: { type: "check" },
  },
];

function CellIcon({ type, label }: { type: CellDisplay; label?: string }) {
  if (type === "pill" && label) {
    return (
      <View style={[styles.pill, styles.pillPro]}>
        <Text style={[styles.pillText, styles.pillTextPro]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }
  if (type === "check") {
    return (
      <View style={styles.checkBubble}>
        <MaterialCommunityIcons name="check" size={14} color={Colors.white} />
      </View>
    );
  }
  return (
    <MaterialCommunityIcons name="close" size={18} color={Colors.gray400} />
  );
}

export default function UpgradeScreen() {
  const router = useRouter();
  const { push, replace } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();
  const [billing, setBilling] = useState<BillingPeriod>("annual");
  const params = useLocalSearchParams<{ fromOnboarding?: string }>();
  const fromOnboarding =
    params.fromOnboarding === "1" || params.fromOnboarding === "true";

  const scrollCompact = windowH < 720;

  const goToDashboard = () => {
    replace("/(logged-in)/dashboard" as Href);
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
            paddingBottom: insets.bottom + 24,
          },
          !scrollCompact && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={scrollCompact}
        bounces={scrollCompact}
      >
        <ProTierCard
          billing={billing}
          onBillingChange={setBilling}
          onCta={() =>
            push(`/(logged-in)/pro-checkout?billing=${billing}` as Href)
          }
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

function ProTierCard({
  billing,
  onBillingChange,
  onCta,
  showNoThanks,
  onNoThanks,
}: {
  billing: BillingPeriod;
  onBillingChange: (b: BillingPeriod) => void;
  onCta: () => void;
  showNoThanks?: boolean;
  onNoThanks?: () => void;
}) {
  const isAnnual = billing === "annual";

  return (
    <View style={styles.cardShell}>
      <View style={styles.billingToggleInCard}>
        <Pressable
          style={[
            styles.toggleSegInCard,
            billing === "annual" && styles.toggleSegInCardActive,
          ]}
          onPress={() => onBillingChange("annual")}
        >
          <Text
            style={[
              styles.toggleSegTextInCard,
              billing === "annual" && styles.toggleSegTextInCardActive,
            ]}
          >
            Annual
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleSegInCard,
            billing === "monthly" && styles.toggleSegInCardActive,
          ]}
          onPress={() => onBillingChange("monthly")}
        >
          <Text
            style={[
              styles.toggleSegTextInCard,
              billing === "monthly" && styles.toggleSegTextInCardActive,
            ]}
          >
            Monthly
          </Text>
        </Pressable>
      </View>

      <View style={styles.priceBlock}>
        {isAnnual ? (
          <View style={styles.priceRowWithSave}>
            <View style={styles.priceColumn}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceHuge, styles.priceOnDark]}>
                  $39.99
                </Text>
                <View style={styles.priceSide}>
                  <Text style={styles.billingCadenceOnDark}>/ year (USD)</Text>
                  <Text style={styles.billedYearlyOnDark}>billed yearly</Text>
                </View>
              </View>
              <Text style={styles.equivalentLine}>$3.33 / mo</Text>
            </View>
            <View style={styles.saveBadgePrice}>
              <Text style={styles.saveBadgePriceText}>Save 33%</Text>
            </View>
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Text style={[styles.priceHuge, styles.priceOnDark]}>$4.99</Text>
            <Text style={styles.billingCadenceDark}>/ month (USD)</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardDescriptionOnDark}>
        Unlock the full Crittr experience — unlimited pets, co-care, uploads,
        CrittrAI, and more.
      </Text>

      <View style={styles.dottedRuleLight} />

      <Text style={styles.featureListLabelOnDark}>Everything in Pro</Text>
      {COMPARISON_ROWS.map((row) => (
        <View key={row.title} style={styles.featureRow}>
          <View style={styles.featureRowIcon}>
            <CellIcon {...row.pro} />
          </View>
          <View style={styles.featureRowText}>
            <Text style={styles.featureRowTitleOnDark}>{row.title}</Text>
            {row.subtitle ? (
              <Text style={styles.featureRowSubOnDark}>{row.subtitle}</Text>
            ) : null}
          </View>
        </View>
      ))}

      <OrangeButton style={styles.cta} onPress={onCta}>
        Start free 7-day trial →
      </OrangeButton>

      {showNoThanks && onNoThanks ? (
        <Pressable
          onPress={onNoThanks}
          style={({ pressed }) => [
            styles.noThanksBtn,
            pressed && styles.noThanksBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="No thanks, continue to the app"
        >
          <Text style={styles.noThanksText}>No thanks</Text>
        </Pressable>
      ) : null}

      <Text style={styles.disclaimerOnDark}>
        No charge until your trial ends · Cancel anytime
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  topBar: {
    paddingBottom: 12,
  },
  topBarInner: {
    minHeight: 44,
    justifyContent: "center",
  },
  topTitleWrap: {
    position: "absolute",
    left: 52,
    right: 52,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  topTierNameCentered: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: Colors.white,
    textAlign: "center",
    width: "100%",
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    zIndex: 1,
  },
  backInRow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  goProInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexShrink: 0,
  },
  goProInlineText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.orange,
  },
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    paddingHorizontal: 20,
  },
  /** Full-bleed content on gradient — no inset “card” panel. */
  cardShell: {
    flex: 1,
    paddingBottom: 8,
  },
  billingToggleInCard: {
    flexDirection: "row",
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  toggleSegInCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  toggleSegInCardActive: {
    backgroundColor: Colors.orange,
  },
  toggleSegTextInCard: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },
  toggleSegTextInCardActive: {
    color: Colors.white,
  },
  priceBlock: {
    marginBottom: 14,
  },
  priceRowWithSave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceColumn: {
    flex: 1,
    minWidth: 0,
  },
  saveBadgePrice: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  saveBadgePriceText: {
    fontFamily: Font.uiBold,
    fontSize: 12,
    color: Colors.white,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  priceHuge: {
    fontFamily: Font.displayBold,
    fontSize: 40,
    letterSpacing: -1,
    color: Colors.textPrimary,
  },
  priceOnDark: {
    color: Colors.white,
  },
  priceSide: {
    marginBottom: 6,
  },
  billingCadenceOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  billedYearlyOnDark: {
    fontFamily: Font.uiMedium,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  billingCadenceDark: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },
  equivalentLine: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
    marginTop: 6,
  },
  cardDescriptionOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.78)",
    marginBottom: 16,
  },
  dottedRuleLight: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 16,
  },
  featureListLabelOnDark: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.4,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  featureRowIcon: {
    paddingTop: 2,
    minWidth: 28,
    alignItems: "center",
  },
  featureRowText: {
    flex: 1,
  },
  featureRowTitleOnDark: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.white,
  },
  featureRowSubOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  checkBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    maxWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillPro: {
    backgroundColor: Colors.orangeLight,
    borderWidth: 1,
    borderColor: "rgba(252, 141, 44, 0.35)",
  },
  pillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 10,
    color: Colors.gray700,
    textAlign: "center",
  },
  pillTextPro: {
    color: Colors.orangeDark,
  },
  cta: {
    marginTop: 8,
    marginBottom: 8,
  },
  noThanksBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  noThanksBtnPressed: {
    opacity: 0.7,
  },
  noThanksText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  disclaimerOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
});
