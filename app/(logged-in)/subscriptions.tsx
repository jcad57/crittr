import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { ProSubscriptionManagementView, canManageStoreSubscription } from "@/components/screens/subscriptions/ProSubscriptionManagementView";
import { ProFreePlanView } from "@/components/pro/flow/ProFreePlanView";
import { ProFlowPage, flowStyles } from "@/components/pro/flow/ProFlowUi";
import { profileQueryKey, subscriptionDetailsQueryKey, useProfileQuery, useSubscriptionDetailsQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { syncCrittrProForSession } from "@/lib/iap/entitlementSync";
import { storeLabel } from "@/lib/iap/storeTerms";
import { openManageSubscriptions } from "@/services/iapSubscription";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/theme/colors";

export default function SubscriptionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const { data: profile, isLoading: profileLoading } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const details = useSubscriptionDetailsQuery();
  const sub = details.data;
  const [checking, setChecking] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const [managing, setManaging] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (!userId || refreshing.current) return;
    refreshing.current = true;
    setChecking(true);
    try {
      const result = await syncCrittrProForSession(userId);
      if (useAuthStore.getState().session?.user?.id !== userId) return;
      setSyncFailed(result === "failed");
      await useAuthStore.getState().refreshProfileOnly();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: subscriptionDetailsQueryKey(userId) }),
      ]);
    } catch { if (useAuthStore.getState().session?.user?.id === userId) setSyncFailed(true); }
    finally { refreshing.current = false; setChecking(false); }
  }, [queryClient, userId]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    const listener = AppState.addEventListener("change", (next) => { if (next === "active") void refresh(); });
    return () => listener.remove();
  }, [refresh]);
  const exit = () => { if (router.canGoBack()) router.back(); else router.replace("/(logged-in)/(tabs)/dashboard"); };
  const restore = () => router.push({ pathname: "/(logged-in)/pro-checkout", params: { action: "restore", returnTo: "subscriptions" } });
  const manage = async () => {
    if (managing) return;
    setManaging(true); setManageError(null);
    try { await openManageSubscriptions(sub?.managementUrl); }
    catch { setManageError(`We couldn’t open ${sub?.storeLabel || storeLabel()} subscription settings. Try again, or open subscriptions from your device’s store account settings.`); }
    finally { setManaging(false); }
  };
  const failed = details.isError || syncFailed;
  const loadingFree = !isPro && (checking || details.isLoading || profileLoading);
  const showFree = !isPro && !failed && sub?.status !== "billing_issue" && !sub?.cancelAtPeriodEnd;
  return <ProFlowPage onBack={exit} brand={false} footer={!loadingFree && !showFree && canManageStoreSubscription(sub) ? <OrangeButton onPress={() => void manage()} loading={managing}>{sub?.status === "billing_issue" ? "Update payment method" : sub?.cancelAtPeriodEnd ? "Manage or renew subscription" : "Manage subscription"}</OrangeButton> : undefined} refreshing={checking && isPro ? <ActivityIndicator size="small" color={Colors.orange} /> : undefined}>
    {loadingFree ? <View style={styles.centered}><ActivityIndicator color={Colors.orange} /><Text style={flowStyles.subtitle}>Checking your subscription…</Text></View> : showFree ? <ProFreePlanView onExit={() => router.replace("/(logged-in)/(tabs)/pets")} onUpgrade={() => router.push("/(logged-in)/upgrade?returnTo=subscriptions")} onRestore={restore} /> : <ProSubscriptionManagementView showManageCta={false} sub={sub} loading={details.isLoading} failed={failed} checking={checking} managing={managing} manageError={manageError} onManage={() => void manage()} onRestore={restore} onRefresh={() => void refresh()} />}
  </ProFlowPage>;
}
const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 60 },
});
