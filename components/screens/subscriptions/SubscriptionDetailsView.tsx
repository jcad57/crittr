import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { OrganicSurface } from "@/components/pro/flow/ProFlowUi";
import type { SubscriptionDetails } from "@/services/iapSubscription";
import { formatSubscriptionDate as formatDate, formatStatus } from "@/utils/subscriptionDisplay";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";

export function subscriptionRenewalCopy(sub: SubscriptionDetails): string {
  if (sub.isLifetime) return "Lifetime access · No recurring charges";
  if (sub.isPromotional) return sub.currentPeriodEnd ? `Complimentary until · ${formatDate(sub.currentPeriodEnd)}` : "Complimentary access · No recurring charges";
  if (sub.isFamilyShared) return "Billing is managed by the family organizer";
  if (sub.cancelAtPeriodEnd) return `Access ends · ${formatDate(sub.currentPeriodEnd)}`;
  if (sub.status === "billing_issue") return "Update your payment method in the store";
  if (sub.status === "expired") return `Access ended · ${formatDate(sub.currentPeriodEnd)}`;
  return `${sub.status === "trialing" ? "Trial ends" : "Next renewal"} · ${formatDate(sub.currentPeriodEnd)}`;
}
export function SubscriptionDetailsView({ sub }: { sub: SubscriptionDetails }) {
  const compact = useWindowDimensions().height < 900;
  const cadence = sub.isLifetime ? "Lifetime" : sub.isPromotional ? "Complimentary" : sub.planLabel === "annual" ? "Annual" : "Monthly";
  const price = sub.isLifetime || sub.isPromotional ? cadence : `${cadence}${sub.priceFormatted !== "—" ? ` · ${sub.priceFormatted}` : ""}`;
  return <OrganicSurface color={Colors.featureDark} variant="hero" style={[styles.hero, compact && { paddingTop: 19, paddingBottom: 18, paddingHorizontal: 18, marginTop: 17 }]}>
    <View style={[styles.top, compact && { minHeight: 47 }]}>
      <View style={{ flex: 1, zIndex: 1 }}><View style={styles.brandRow}><MaterialCommunityIcons name="crown" color={Colors.orange} size={25} /><Text style={styles.brand}>Crittr Pro</Text></View><Text style={styles.tagline}>More care for more of what you love.</Text></View>
      <Image source={require("@/assets/images/pro/companions.png")} style={[styles.art, compact && { width: 58, height: 58 }]} contentFit="contain" accessibilityElementsHidden />
    </View>
    <View style={[styles.planRow, compact && { marginTop: 8 }]}><View style={{ flex: 1 }}><Text style={styles.price}>{price}</Text>{sub.isFamilyShared ? <Text style={styles.subline}>Family Sharing</Text> : sub.storeLabel && !sub.isPromotional ? <Text style={styles.subline}>Billed through {sub.storeLabel}</Text> : null}</View><View style={[styles.status, sub.status === "billing_issue" && { backgroundColor: "#F6D5C8" }]}><Text style={styles.statusText}>{sub.cancelAtPeriodEnd && sub.status !== "expired" ? "Ending" : formatStatus(sub.status)}</Text></View></View>
    <View style={[styles.rule, compact && { marginVertical: 11 }]} />
    <Text style={styles.renewal}>{subscriptionRenewalCopy(sub)}</Text>
  </OrganicSurface>;
}
const styles = StyleSheet.create({
  hero: { padding: 23, paddingTop: 27, paddingBottom: 24, marginTop: 22 },
  top: { minHeight: 65, flexDirection: "row", alignItems: "flex-start" }, brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { fontFamily: Font.displayBold, fontSize: 26, color: Colors.warmWhite }, tagline: { fontFamily: Font.uiRegular, fontSize: 11, lineHeight: 16, color: "#DDD5CB", marginTop: 6, maxWidth: 220 },
  art: { width: 76, height: 76, opacity: 0.95, marginTop: -8, marginRight: -8 },
  planRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 14 }, price: { fontFamily: Font.uiBold, color: Colors.warmWhite, fontSize: 17, lineHeight: 23 },
  subline: { fontFamily: Font.uiRegular, fontSize: 12, color: "#CCC5BD", marginTop: 5 },
  status: { backgroundColor: "#DDE8C2", borderRadius: 13, paddingVertical: 4, paddingHorizontal: 11 }, statusText: { fontFamily: Font.uiBold, fontSize: 11, color: "#34452B" },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: "#62594E", marginVertical: 17 }, renewal: { fontFamily: Font.uiRegular, fontSize: 13, lineHeight: 20, color: "#E5DED5" },
});
