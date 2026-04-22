import { styles } from "@/screen-styles/upgrade.styles";
import { CellIcon } from "@/components/screens/upgrade/CellIcon";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { UPGRADE_COMPARISON_ROWS } from "@/constants/upgradeComparison";
import type { ProPricing } from "@/services/proPricing";
import { Pressable, Text, View } from "react-native";

type BillingPeriod = "annual" | "monthly";

export function ProTierCard({
  pricing,
  billing,
  onBillingChange,
  onCta,
  showNoThanks,
  onNoThanks,
  billingAnchorActive,
  introTrialEligible,
}: {
  pricing: ProPricing;
  billing: BillingPeriod;
  onBillingChange: (b: BillingPeriod) => void;
  onCta: () => void;
  showNoThanks?: boolean;
  onNoThanks?: () => void;
  billingAnchorActive: boolean;
  introTrialEligible: boolean | null;
}) {
  const isAnnual = billing === "annual";
  const curUpper = pricing.monthly.currency.toUpperCase();
  const showSaveBadge =
    pricing.annual.savingsVsMonthlyPercent != null &&
    pricing.annual.savingsVsMonthlyPercent > 0;

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
                  {pricing.annual.formatted}
                </Text>
                <View style={styles.priceSide}>
                  <Text style={styles.billingCadenceOnDark}>
                    / year ({curUpper})
                  </Text>
                  <Text style={styles.billedYearlyOnDark}>billed yearly</Text>
                </View>
              </View>
              <Text style={styles.equivalentLine}>
                {pricing.annual.equivalentMonthlyFormatted} / mo
              </Text>
            </View>
            {showSaveBadge ? (
              <View style={styles.saveBadgePrice}>
                <Text style={styles.saveBadgePriceText}>
                  Save {pricing.annual.savingsVsMonthlyPercent}%
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.priceRow}>
            <Text style={[styles.priceHuge, styles.priceOnDark]}>
              {pricing.monthly.formatted}
            </Text>
            <Text style={styles.billingCadenceDark}>
              / month ({curUpper})
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.cardDescriptionOnDark}>
        Unlock the full Crittr experience — unlimited pets, co-care, uploads,
        CrittrAI, and more.
      </Text>

      <View style={styles.dottedRuleLight} />

      <Text style={styles.featureListLabelOnDark}>Everything in Pro</Text>
      {UPGRADE_COMPARISON_ROWS.map((row) => (
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

      <View style={styles.featuresEndSpacer} />

      <Text style={styles.disclaimerOnDark}>
        {billingAnchorActive
          ? "Renewal timing follows your current paid-through date with Stripe."
          : introTrialEligible === false
            ? "No free intro trial — this account already has a Crittr Pro billing history. You are charged when you finish checkout."
            : "No charge until your trial ends · Cancel anytime"}
      </Text>

      <OrangeButton style={styles.cta} onPress={onCta}>
        {billingAnchorActive
          ? "Continue to checkout →"
          : introTrialEligible === false
            ? "Continue to Crittr Pro →"
            : "Start free 7-day trial →"}
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
    </View>
  );
}
