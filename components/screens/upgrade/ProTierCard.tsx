import { styles } from "@/screen-styles/upgrade.styles";
import { CellIcon } from "@/components/screens/upgrade/CellIcon";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { UPGRADE_COMPARISON_ROWS } from "@/constants/upgradeComparison";
import { storeAccountLabel } from "@/lib/iap/storeTerms";
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
}: {
  pricing: ProPricing;
  billing: BillingPeriod;
  onBillingChange: (b: BillingPeriod) => void;
  onCta: () => void;
  showNoThanks?: boolean;
  onNoThanks?: () => void;
}) {
  const isAnnual = billing === "annual";
  const curUpper = pricing.monthly.currency.toUpperCase();
  const showSaveBadge =
    pricing.annual.savingsVsMonthlyPercent != null &&
    pricing.annual.savingsVsMonthlyPercent > 0;

  /**
   * Only advertise a trial once the store has confirmed one for the selected
   * plan and this account. Until then the copy stays factual.
   */
  const trial = isAnnual ? pricing.annual.trial : pricing.monthly.trial;
  const knownNoTrial = pricing.resolved && trial == null;

  /**
   * A missing trial can mean the account already used one or that the plan
   * never had one, and the store doesn't say which — so the copy states the
   * consequence rather than guessing the cause.
   */
  const disclaimer = trial
    ? `No charge until your ${trial.durationLabel} trial ends · Cancel anytime`
    : knownNoTrial
      ? `No free trial is available for your ${storeAccountLabel()} — you are charged when you finish checkout. Cancel anytime.`
      : "Cancel anytime";

  const ctaLabel = trial
    ? `Start ${trial.durationLabel} free trial →`
    : knownNoTrial
      ? "Continue to Crittr Pro →"
      : "Get Crittr Pro →";

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

      <Text style={styles.disclaimerOnDark}>{disclaimer}</Text>

      <OrangeButton style={styles.cta} onPress={onCta}>
        {ctaLabel}
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
