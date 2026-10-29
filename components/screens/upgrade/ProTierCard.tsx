import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { ProBenefitGrid, ProIllustration, flowStyles } from "@/components/pro/flow/ProFlowUi";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { ProPricing } from "@/services/proPricing";

type BillingPeriod = "annual" | "monthly";
export function ProTierCard({ pricing, billing, onBillingChange, onCta, busy = false, showCta = true }: {
  pricing: ProPricing; billing: BillingPeriod; onBillingChange: (b: BillingPeriod) => void;
  onCta: () => void; busy?: boolean; showCta?: boolean;
}) {
  const { height } = useWindowDimensions();
  const compact = height < 1000;
  return <View style={{ gap: compact ? 8 : 17 }}>
    <View>
      <Text style={[flowStyles.title, flowStyles.center, compact && { fontSize: 26, lineHeight: 29 }]}>More care.{'\n'}Every companion.</Text>
      <Text style={[flowStyles.subtitle, flowStyles.center, { fontSize: compact ? 13 : 14, lineHeight: compact ? 18 : 19, marginTop: compact ? 4 : 6 }]}>Everything you need for every pet,{'\n'}now and always.</Text>
    </View>
    <ProIllustration height={compact ? 95 : 145} />
    <ProBenefitGrid compact dense={compact} />
    <View style={{ gap: 8 }}>
      {(["annual", "monthly"] as const).map((period) => {
        const selected = billing === period;
        const annual = period === "annual";
        const tier = pricing[period];
        const saving = annual && pricing.resolved && pricing.annual.savingsVsMonthlyPercent;
        return <Pressable key={period} onPress={() => onBillingChange(period)} disabled={busy}
          accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: busy }} accessibilityLabel={`${annual ? "Annual" : "Monthly"} plan, ${pricing.resolved ? `${tier.formatted} per ${annual ? "year" : "month"}` : "price loading"}`}
          style={({ pressed }) => [styles.plan, compact && { minHeight: 60, paddingVertical: 8 }, selected && styles.selected, pressed && { opacity: 0.85 }]}>
          <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
          <View style={{ flex: 1 }}>
            <View style={styles.planHeading}><Text style={[styles.planTitle, selected && styles.light]}>{annual ? "Annual" : "Monthly"}</Text>{saving ? <View style={styles.badge}><Text style={styles.badgeText}>Best value</Text></View> : null}</View>
            <Text style={[styles.price, selected && styles.light]}>{pricing.resolved ? tier.formatted : "Checking price…"}{pricing.resolved ? <Text style={styles.cadence}> / {annual ? "year" : "month"}</Text> : null}</Text>
            {annual && pricing.resolved ? <Text style={[styles.meta, selected && { color: "#DBD5CE" }]}>{pricing.annual.equivalentMonthlyFormatted} / month{saving ? <Text style={{ color: selected ? Colors.orange : Colors.orangeDark }}> · Save {saving}%</Text> : null}</Text> : null}
            {!compact && pricing.resolved && tier.trial ? <Text style={[styles.meta, selected && { color: "#DBD5CE" }]}>{tier.trial.durationLabel} free trial, then {tier.formatted}/{annual ? "year" : "month"}</Text> : null}
          </View>
          {selected ? <MaterialCommunityIcons name="check" size={18} color={Colors.orange} /> : null}
        </Pressable>;
      })}
    </View>
    {showCta ? <><OrangeButton onPress={onCta} disabled={!pricing.resolved || busy} loading={busy} accessibilityLabel={`Continue with ${billing} plan`}>
      {pricing.resolved ? `Continue with ${billing}` : "Loading prices…"}
    </OrangeButton>
    <Text style={flowStyles.finePrint}>{pricing.resolved && pricing[billing].trial ? `No charge during your ${pricing[billing].trial?.durationLabel} trial. ` : ""}Billed {billing === "annual" ? "annually" : "monthly"}. Cancel anytime.</Text></> : null}
  </View>;
}
const styles = StyleSheet.create({
  plan: { minHeight: 64, borderRadius: 18, borderWidth: 1, borderColor: Colors.creamDark, paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 12 },
  selected: { backgroundColor: Colors.featureDark, borderColor: Colors.featureDark },
  planHeading: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  planTitle: { fontFamily: Font.uiBold, fontSize: 14, color: Colors.textPrimary },
  price: { fontFamily: Font.uiBold, fontSize: 17, lineHeight: 22, color: Colors.textPrimary },
  light: { color: Colors.warmWhite }, cadence: { fontFamily: Font.uiMedium, fontSize: 13 },
  meta: { fontFamily: Font.uiRegular, fontSize: 11, lineHeight: 16, color: "#65635F" },
  badge: { borderRadius: 10, backgroundColor: "#FAD2A2", paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: Font.uiBold, fontSize: 10, color: "#63401C" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#99948D", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: Colors.white, backgroundColor: Colors.white }, radioDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.orange },
});
