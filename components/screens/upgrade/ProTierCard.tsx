import { styles } from "@/screen-styles/upgrade.styles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import { PRO_PAYWALL_BENEFITS, PRO_PAYWALL_HEADLINE } from "@/constants/proCopy";
import { useProUpgradeCta } from "@/hooks/useProUpgradeCta";
import type { ProPricing } from "@/services/proPricing";
import { proPaywallDisclaimer } from "@/utils/proUpgradeCta";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
  const { label: ctaLabel } = useProUpgradeCta(billing);
  const showSaveBadge =
    pricing.annual.savingsVsMonthlyPercent != null &&
    pricing.annual.savingsVsMonthlyPercent > 0;

  const trial = isAnnual ? pricing.annual.trial : pricing.monthly.trial;
  const disclaimer = proPaywallDisclaimer(trial);

  return (
    <View style={styles.cardShell}>
      <Text style={styles.headline}>{PRO_PAYWALL_HEADLINE}</Text>

      <Pressable
        onPress={() => onBillingChange("annual")}
        style={[styles.planCard, isAnnual && styles.planCardSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: isAnnual }}
        accessibilityLabel="Annual plan, best value"
      >
        <View style={styles.planCardTop}>
          <Text
            style={[styles.planName, isAnnual && styles.planNameSelected]}
          >
            Annual
          </Text>
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>Best value</Text>
          </View>
        </View>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{pricing.annual.formatted}</Text>
          <Text style={styles.planCadence}> / year</Text>
        </View>
        <Text style={styles.planMeta}>
          {pricing.annual.equivalentMonthlyFormatted} / mo
          {showSaveBadge
            ? ` · Save ${pricing.annual.savingsVsMonthlyPercent}%`
            : ""}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onBillingChange("monthly")}
        style={[styles.planCard, !isAnnual && styles.planCardSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: !isAnnual }}
        accessibilityLabel="Monthly plan"
      >
        <Text
          style={[styles.planName, !isAnnual && styles.planNameSelected]}
        >
          Monthly
        </Text>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>{pricing.monthly.formatted}</Text>
          <Text style={styles.planCadence}> / month</Text>
        </View>
      </Pressable>

      <View style={styles.benefitList}>
        {PRO_PAYWALL_BENEFITS.map((row) => (
          <View key={row.title} style={styles.featureRow}>
            <View style={styles.featureRowIcon}>
              <View style={styles.benefitIconBubble}>
                <MaterialCommunityIcons
                  name={row.icon}
                  size={18}
                  color={Colors.orange}
                />
              </View>
            </View>
            <View style={styles.featureRowText}>
              <Text style={styles.featureRowTitleOnDark}>{row.title}</Text>
              <Text style={styles.featureRowSubOnDark}>{row.subtitle}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimerOnDark}>{disclaimer}</Text>

      <OrangeButton style={styles.cta} onPress={onCta} accessibilityLabel={ctaLabel}>
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
