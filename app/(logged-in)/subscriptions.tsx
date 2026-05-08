import { SubscriptionDetailsView } from "@/components/screens/subscriptions/SubscriptionDetailsView";
import { SubscriptionsNavHeader } from "@/components/screens/subscriptions/SubscriptionsNavHeader";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import {
  profileQueryKey,
  subscriptionDetailsQueryKey,
  useProfileQuery,
  useSubscriptionDetailsQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import {
  ProPurchaseException,
  restoreProPurchases,
} from "@/lib/iap/checkout";
import { syncCrittrProForSession } from "@/lib/iap/entitlementSync";
import { openManageSubscriptions } from "@/services/iapSubscription";
import { useCrittrProStore } from "@/stores/crittrProStore";
import { useAuthStore } from "@/stores/authStore";
import { formatSubscriptionDate as formatDate } from "@/utils/subscriptionDisplay";
import { useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/subscriptions.styles";

export default function SubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const refreshProfileOnly = useAuthStore((s) => s.refreshProfileOnly);
  const isMockPro = useCrittrProStore((s) => s.isMockPro);

  const { data: profile, isLoading: profileLoading } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);

  const detailsEnabled = !isMockPro;
  const {
    data: sub,
    isLoading: detailsLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSubscriptionDetailsQuery(detailsEnabled);

  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  /** True when the user has cancelled but their paid period hasn't ended yet. */
  const pendingNonRenewalAccess = useMemo(() => {
    if (!sub?.cancelAtPeriodEnd || !sub.currentPeriodEnd) return false;
    const end = new Date(sub.currentPeriodEnd);
    return !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
  }, [sub]);

  const goUpgrade = useCallback(() => {
    const q = new URLSearchParams();
    q.set("returnTo", "subscriptions");
    router.push(`/(logged-in)/upgrade?${q.toString()}` as Href);
  }, [router]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setPullRefreshing(true);
    try {
      await syncCrittrProForSession(userId);
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      await queryClient.invalidateQueries({
        queryKey: subscriptionDetailsQueryKey(userId),
      });
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [userId, queryClient, refetch]);

  /** App store cancellations don't push live updates; refetch on focus to catch them. */
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: subscriptionDetailsQueryKey(userId),
      });
    }, [queryClient, userId]),
  );

  const onManageSubscription = useCallback(async () => {
    try {
      await openManageSubscriptions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't open subscription settings", msg);
    }
  }, []);

  const onRestore = useCallback(async () => {
    setRestoring(true);
    try {
      const result = await restoreProPurchases();
      if (!result.hasCrittrPro) {
        Alert.alert(
          "Nothing to restore",
          "We couldn't find an active Crittr Pro subscription on this account.",
        );
        return;
      }
      await syncCrittrProForSession(userId);
      await refreshProfileOnly();
      if (userId) {
        await queryClient.invalidateQueries({
          queryKey: subscriptionDetailsQueryKey(userId),
        });
      }
      Alert.alert("Restored", "Your Crittr Pro subscription is active again.");
    } catch (e) {
      if (e instanceof ProPurchaseException && e.userCancelled) return;
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Restore failed", msg);
    } finally {
      setRestoring(false);
    }
  }, [queryClient, refreshProfileOnly, userId]);

  const showNavRefetch =
    detailsEnabled && isFetching && !detailsLoading && !pullRefreshing;

  if (profileLoading && !profile) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!isPro && !isMockPro) {
    const subLoadSettled = !detailsLoading;
    if (subLoadSettled && !isError && !pendingNonRenewalAccess) {
      return <Redirect href="/(logged-in)/upgrade?returnTo=subscriptions" />;
    }

    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubscriptionsNavHeader
          onBack={() => router.back()}
          showRefetchSpinner={showNavRefetch}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            styles.scrollContentGrow,
            { paddingBottom: scrollInsetBottom },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.orange}
            />
          }
        >
          <Text style={styles.lead}>
            {isError
              ? "We couldn't refresh billing. Try again below."
              : detailsLoading
                ? "Checking your subscription status…"
                : pendingNonRenewalAccess
                  ? "Your plan is set to end with this billing period. You can resubscribe in the App Store or Play Store to continue without a gap."
                  : ""}
          </Text>

          {detailsLoading ? (
            <View style={styles.blockCenter}>
              <ActivityIndicator size="large" color={Colors.orange} />
              <Text style={styles.hint}>Checking subscription…</Text>
            </View>
          ) : isError ? (
            <View style={styles.card}>
              <Text style={styles.errText}>
                {error instanceof Error
                  ? error.message
                  : "Could not load subscription."}
              </Text>
              <OrangeButton
                onPress={() => void refetch()}
                style={styles.retryBtn}
                loading={isFetching}
              >
                Try again
              </OrangeButton>
            </View>
          ) : null}

          {pendingNonRenewalAccess ? (
            <>
              <View style={styles.cancelPushSpacer} />
              <OrangeButton
                onPress={goUpgrade}
                accessibilityLabel="Re-subscribe to Crittr Pro"
              >
                Re-subscribe to Crittr Pro
              </OrangeButton>
            </>
          ) : null}

          <Pressable
            onPress={onRestore}
            disabled={restoring}
            style={({ pressed }) => [
              styles.restoreLink,
              restoring && styles.cancelOutlineDisabled,
              pressed && styles.cancelOutlinePressed,
            ]}
          >
            <Text style={styles.restoreLinkText}>
              {restoring ? "Restoring…" : "Restore purchases"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (isMockPro) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <SubscriptionsNavHeader onBack={() => router.back()} />
        <View style={[styles.body, { paddingBottom: scrollInsetBottom }]}>
          <Text style={styles.lead}>
            Mock Pro is enabled for testing. Connect a real subscription in a
            non-mock session to manage billing here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <SubscriptionsNavHeader
        onBack={() => router.back()}
        showRefetchSpinner={showNavRefetch}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.orange}
          />
        }
      >
        {detailsLoading && !sub ? (
          <View style={styles.blockCenter}>
            <ActivityIndicator size="large" color={Colors.orange} />
            <Text style={styles.hint}>Loading subscription…</Text>
          </View>
        ) : isError ? (
          <View style={styles.card}>
            <Text style={styles.errText}>
              {error instanceof Error
                ? error.message
                : "Could not load subscription."}
            </Text>
            <OrangeButton
              onPress={() => void refetch()}
              style={styles.retryBtn}
              loading={isFetching}
            >
              Try again
            </OrangeButton>
          </View>
        ) : sub ? (
          <>
            <SubscriptionDetailsView sub={sub} />

            {pendingNonRenewalAccess ? (
              <>
                <View style={styles.cancelPushSpacer} />
                <OrangeButton
                  onPress={goUpgrade}
                  accessibilityLabel="Re-subscribe to Crittr Pro"
                >
                  Re-subscribe to Crittr Pro
                </OrangeButton>
              </>
            ) : !sub.cancelAtPeriodEnd &&
              (sub.status === "active" || sub.status === "trialing") &&
              !sub.isFamilyShared ? (
              <>
                <View style={styles.cancelPushSpacer} />
                <Pressable
                  onPress={onManageSubscription}
                  style={({ pressed }) => [
                    styles.cancelOutline,
                    pressed && styles.cancelOutlinePressed,
                  ]}
                >
                  <Text style={styles.cancelOutlineText}>
                    Manage or cancel subscription
                  </Text>
                </Pressable>
              </>
            ) : null}

            <Pressable
              onPress={onRestore}
              disabled={restoring}
              style={({ pressed }) => [
                styles.restoreLink,
                restoring && styles.cancelOutlineDisabled,
                pressed && styles.cancelOutlinePressed,
              ]}
            >
              <Text style={styles.restoreLinkText}>
                {restoring ? "Restoring…" : "Restore purchases"}
              </Text>
            </Pressable>

            {sub.isFamilyShared ? (
              <Text style={styles.footnote}>
                This subscription was shared with you via Apple Family Sharing.
                The owner manages billing.
              </Text>
            ) : null}

            {formatDate(sub.currentPeriodEnd) === "—" ? null : null}
          </>
        ) : !detailsLoading ? (
          <View style={styles.card}>
            <Text style={styles.errText}>
              We couldn't find subscription details. Pull to refresh or try
              again later.
            </Text>
            <OrangeButton
              onPress={() => void refetch()}
              style={styles.retryBtn}
              loading={isFetching}
            >
              Try again
            </OrangeButton>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
