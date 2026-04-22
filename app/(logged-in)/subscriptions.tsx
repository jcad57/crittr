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
import { cancelSubscriptionAtPeriodEnd } from "@/services/stripeSubscription";
import { useCrittrProStore } from "@/stores/crittrProStore";
import { useAuthStore } from "@/stores/authStore";
import {
  formatSubscriptionDate as formatDate,
  formatStatus,
} from "@/utils/subscriptionDisplay";
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

  const [canceling, setCanceling] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  /** Stripe: cancel at period end and paid access still in the future. */
  const pendingNonRenewalAccess = useMemo(() => {
    if (!sub?.cancelAtPeriodEnd || !sub.currentPeriodEnd) return false;
    const end = new Date(sub.currentPeriodEnd);
    return !Number.isNaN(end.getTime()) && end.getTime() > Date.now();
  }, [sub]);

  const upgradeBillingAnchor = useMemo((): string | undefined => {
    if (!pendingNonRenewalAccess || !sub?.currentPeriodEnd) return undefined;
    return sub.currentPeriodEnd.slice(0, 10);
  }, [pendingNonRenewalAccess, sub?.currentPeriodEnd]);

  const goUpgrade = useCallback(() => {
    const q = new URLSearchParams();
    q.set("returnTo", "subscriptions");
    if (upgradeBillingAnchor) q.set("billingAnchor", upgradeBillingAnchor);
    router.push(`/(logged-in)/upgrade?${q.toString()}` as Href);
  }, [router, upgradeBillingAnchor]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setPullRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      await queryClient.invalidateQueries({
        queryKey: subscriptionDetailsQueryKey(userId),
      });
      await refetch();
    } finally {
      setPullRefreshing(false);
    }
  }, [userId, queryClient, refetch]);

  /** Same idea as notifications: global 5m staleTime would hide Stripe-side cancel until refocus/remount. */
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: subscriptionDetailsQueryKey(userId),
      });
    }, [queryClient, userId]),
  );

  const onCancel = useCallback(() => {
    if (!sub?.currentPeriodEnd) return;
    const endLabel = formatDate(sub.currentPeriodEnd);
    Alert.alert(
      "Cancel subscription?",
      `You keep Crittr Pro until ${endLabel}. Then your account moves to the free plan: you keep only the first pet you added (other pets and their data are removed), co-care ends with the usual in-app notifications, and your Crittr billing record in Stripe is removed once the subscription has fully ended.`,
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Cancel subscription",
          style: "destructive",
          onPress: async () => {
            setCanceling(true);
            try {
              await cancelSubscriptionAtPeriodEnd();
              if (userId) {
                await queryClient.invalidateQueries({
                  queryKey: profileQueryKey(userId),
                });
                await queryClient.invalidateQueries({
                  queryKey: subscriptionDetailsQueryKey(userId),
                });
              }
              Alert.alert(
                "Subscription canceled",
                `Your plan will not renew. You keep Pro until ${endLabel}; after that, you're on the free plan with only your first pet, co-care ended, and other pets removed.`,
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert("Could not cancel", msg);
            } finally {
              setCanceling(false);
            }
          },
        },
      ],
    );
  }, [sub?.currentPeriodEnd, queryClient, userId]);

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
    if (
      subLoadSettled &&
      !isError &&
      !pendingNonRenewalAccess
    ) {
      return (
        <Redirect href="/(logged-in)/upgrade?returnTo=subscriptions" />
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
          <Text style={styles.lead}>
            {isError
              ? "We couldn't refresh billing. Try again below."
              : detailsLoading
                ? "Checking your billing status…"
                : pendingNonRenewalAccess
                  ? "Your plan is set to end with this billing period. You can set up billing again so Pro continues after that date."
                  : ""}
          </Text>

          {sub && pendingNonRenewalAccess ? (
            <View style={styles.card}>
              <Text style={styles.planName}>Crittr Pro</Text>
              <Text style={styles.planMeta}>
                {sub.planLabel === "annual" ? "Annual" : "Monthly"} ·{" "}
                {formatStatus(sub.status)}
                {" · Will not renew"}
              </Text>
              {sub.currentPeriodEnd ? (
                <Text style={styles.subLine}>
                  Pro access until {formatDate(sub.currentPeriodEnd)}. Use
                  Re-subscribe to continue without a gap.
                </Text>
              ) : null}
            </View>
          ) : null}

          {detailsLoading ? (
            <View style={styles.blockCenter}>
              <ActivityIndicator size="large" color={Colors.orange} />
              <Text style={styles.hint}>Checking billing…</Text>
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
              {error instanceof Error ? error.message : "Could not load subscription."}
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
              (sub.status === "active" ||
                sub.status === "trialing" ||
                sub.status === "past_due") ? (
              <>
                <View style={styles.cancelPushSpacer} />
                <Pressable
                  onPress={onCancel}
                  disabled={canceling || isFetching}
                  style={({ pressed }) => [
                    styles.cancelOutline,
                    (canceling || isFetching) && styles.cancelOutlineDisabled,
                    pressed && styles.cancelOutlinePressed,
                  ]}
                >
                  <Text style={styles.cancelOutlineText}>
                    {canceling ? "Canceling…" : "Cancel subscription"}
                  </Text>
                </Pressable>
              </>
            ) : null}
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
