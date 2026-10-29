import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { SubscriptionDetailsView } from "@/components/screens/subscriptions/SubscriptionDetailsView";
import { ProBenefitGrid, ProLink, ProNotice, flowStyles, type ProIcon } from "@/components/pro/flow/ProFlowUi";
import type { SubscriptionDetails } from "@/services/iapSubscription";
import { storeLabel } from "@/lib/iap/storeTerms";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";

function ManagementAction({ icon, title, body, onPress, busy }: { icon: ProIcon; title: string; body: string; onPress: () => void; busy?: boolean }) {
  return <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && { opacity: 0.65 }]}>
    <View style={[styles.actionIcon, icon === "apple" && { backgroundColor: "#2791EA" }]}><MaterialCommunityIcons name={icon} size={27} color={icon === "apple" ? Colors.white : Colors.textPrimary} /></View>
    <View style={{ flex: 1 }}><Text style={styles.actionTitle}>{title}</Text><Text style={styles.actionBody}>{body}</Text></View>
    {busy ? <ActivityIndicator size="small" color={Colors.orange} /> : <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textPrimary} />}
  </Pressable>;
}

export function canManageStoreSubscription(sub: SubscriptionDetails | null | undefined): boolean {
  return !!sub && !sub.isFamilyShared && (!sub.isLifetime || !!sub.managementUrl) && (!sub.isPromotional || !!sub.managementUrl);
}

export function ProSubscriptionManagementView({ sub, loading, failed, checking, managing, manageError, onManage, onRestore, onRefresh, showManageCta = true }: {
  sub: SubscriptionDetails | null | undefined; loading?: boolean; failed?: boolean; checking?: boolean; managing?: boolean; manageError?: string | null; showManageCta?: boolean;
  onManage: () => void; onRestore: () => void; onRefresh: () => void;
}) {
  const canManage = canManageStoreSubscription(sub);
  return <>
    <Text accessibilityRole="header" style={[flowStyles.title, { marginTop: 12 }]}>Your subscription</Text>
    <Text style={flowStyles.subtitle}>Manage your plan and billing details.</Text>
    {sub ? <SubscriptionDetailsView sub={sub} /> : loading ? <View style={styles.centered}><ActivityIndicator color={Colors.orange} /><Text style={flowStyles.subtitle}>Loading your plan…</Text></View> : null}
    {failed || (!sub && !loading) ? <View style={{ gap: 6, marginTop: 18 }}><ProNotice title="We couldn’t refresh your subscription" message="Check your connection and try again. Your saved subscription hasn’t been changed." /><ProLink onPress={onRefresh} disabled={checking}>Try again</ProLink></View> : null}
    {sub?.status === "billing_issue" ? <View style={{ marginTop: 16 }}><ProNotice title="Your payment needs attention" message="Update your payment method in the store to keep Pro active." tone="info" /></View> : null}
    <View style={{ gap: 10, marginTop: 18 }}>
      {canManage ? <ManagementAction icon={sub?.storeLabel === "Google Play" ? "google-play" : sub?.storeLabel === "App Store" ? "apple" : "credit-card-outline"} title={`Manage via ${sub?.storeLabel || storeLabel()}`} body="View billing, change plan or cancel." onPress={onManage} busy={managing} /> : null}
      <ManagementAction icon="restore" title="Restore purchases" body="Recover your Pro access." onPress={onRestore} />
    </View>
    {manageError ? <View style={{ marginTop: 14 }}><ProNotice message={manageError} /></View> : null}
    <Text style={styles.sectionTitle}>What you get with Crittr Pro</Text><ProBenefitGrid compact dense />
    {sub?.isFamilyShared ? <Text style={styles.note}>Your family organizer manages billing. You can restore shared access from your Apple account.</Text> : sub?.isLifetime ? <Text style={styles.note}>You have lifetime Pro access. There are no recurring charges for this access.</Text> : sub?.isPromotional ? <Text style={styles.note}>Your complimentary access does not renew or charge you. An existing store subscription must be managed separately.</Text> : null}
    {showManageCta && canManage ? <View style={{ marginTop: 18 }}><OrangeButton onPress={onManage} loading={managing}>{sub?.status === "billing_issue" ? "Update payment method" : sub?.cancelAtPeriodEnd ? "Manage or renew subscription" : "Manage subscription"}</OrangeButton></View> : null}
    <ProLink onPress={onRefresh} disabled={checking}>{checking ? "Refreshing subscription…" : "Refresh subscription"}</ProLink>
  </>;
}
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
  action: { minHeight: 65, borderWidth: 1, borderColor: Colors.creamDark, borderRadius: 20, flexDirection: "row", alignItems: "center", padding: 11, gap: 12 },
  actionIcon: { width: 37, height: 37, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontFamily: Font.uiBold, color: Colors.textPrimary, fontSize: 15 }, actionBody: { fontFamily: Font.uiRegular, color: "#686A63", fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.textPrimary, marginTop: 18, marginBottom: 10 },
  note: { fontFamily: Font.uiRegular, fontSize: 13, lineHeight: 20, color: "#6E6E65", marginTop: 16 },
});
