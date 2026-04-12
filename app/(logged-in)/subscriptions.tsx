import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  profileQueryKey,
  subscriptionDetailsQueryKey,
  useProfileQuery,
  useSubscriptionDetailsQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { cancelSubscriptionAtPeriodEnd } from "@/services/stripeSubscription";
import { useCrittrProStore } from "@/stores/crittrProStore";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatStatus(status: string): string {
  switch (status) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    default:
      return status.replace(/_/g, " ");
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const isMockPro = useCrittrProStore((s) => s.isMockPro);

  const { data: profile, isLoading: profileLoading } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const realPro = isCrittrProFromProfile(profile ?? null);

  const detailsEnabled = Boolean(realPro && !isMockPro);
  const {
    data: sub,
    isLoading: detailsLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSubscriptionDetailsQuery(detailsEnabled);

  const [canceling, setCanceling] = useState(false);

  const onCancel = useCallback(() => {
    if (!sub?.currentPeriodEnd) return;
    const endLabel = formatDate(sub.currentPeriodEnd);
    Alert.alert(
      "Cancel subscription?",
      `You will keep Crittr Pro until ${endLabel}. After that, your subscription ends and Pro features will stop.`,
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
                "Your plan will not renew. You can keep using Pro until the end of the current period.",
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

  if (profileLoading && !profile) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!isPro) {
    return <Redirect href="/(logged-in)/upgrade?returnTo=subscriptions" />;
  }

  if (isMockPro) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={Colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            Subscriptions
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <View style={[styles.body, { paddingBottom: scrollInsetBottom + 24 }]}>
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
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Subscriptions
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
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
            <View style={styles.subscriptionMain}>
              <View style={styles.card}>
                <Text style={styles.planName}>Crittr Pro</Text>
                <Text style={styles.planMeta}>
                  {sub.planLabel === "annual" ? "Annual" : "Monthly"} ·{" "}
                  {formatStatus(sub.status)}
                </Text>
                <Text style={styles.priceLine}>{sub.priceFormatted}</Text>
                {sub.paymentMethodLabel ? (
                  <Text style={styles.subLine}>
                    Card on file: {sub.paymentMethodLabel}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.sectionLabel}>Billing</Text>
              <View style={styles.card}>
                <Row label="Started" value={formatDate(sub.startedAt)} />
                <View style={styles.hairline} />
                <Row
                  label="Current period"
                  value={`${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}`}
                />
                {sub.status === "trialing" && sub.trialEnd ? (
                  <>
                    <View style={styles.hairline} />
                    <Row label="Trial ends" value={formatDate(sub.trialEnd)} />
                  </>
                ) : null}
                <View style={styles.hairline} />
                <Row
                  label="Next billing date"
                  value={
                    sub.cancelAtPeriodEnd
                      ? "No renewal (canceled)"
                      : formatDate(sub.currentPeriodEnd)
                  }
                />
                {sub.cancelAtPeriodEnd ? (
                  <>
                    <View style={styles.hairline} />
                    <Row
                      label="Access until"
                      value={formatDate(sub.currentPeriodEnd)}
                    />
                  </>
                ) : null}
              </View>

              {sub.cancelAtPeriodEnd ? (
                <Text style={styles.footnote}>
                  Your subscription will not renew. You keep Pro until{" "}
                  {formatDate(sub.currentPeriodEnd)}.
                </Text>
              ) : null}
            </View>

            {sub.cancelAtPeriodEnd ? null : sub.status === "active" ||
              sub.status === "trialing" ||
              sub.status === "past_due" ? (
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
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scrollContentGrow: {
    flexGrow: 1,
  },
  subscriptionMain: {
    flexGrow: 0,
  },
  cancelPushSpacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  blockCenter: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    marginBottom: 16,
  },
  planName: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  planMeta: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  priceLine: {
    fontFamily: Font.uiSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  subLine: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    paddingVertical: 10,
    gap: 4,
  },
  rowLabel: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
  },
  footnote: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.gray500,
    marginBottom: 16,
  },
  cancelOutline: {
    marginBottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: "center",
  },
  cancelOutlineDisabled: { opacity: 0.55 },
  cancelOutlinePressed: { opacity: 0.85 },
  cancelOutlineText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.error,
  },
  errText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.error,
    marginBottom: 12,
  },
  retryBtn: { alignSelf: "flex-start" },
});
