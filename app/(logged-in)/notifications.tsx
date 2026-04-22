import { NotificationRow } from "@/components/screens/notifications/NotificationRow";
import { Colors } from "@/constants/colors";
import {
  notificationsKey,
  unreadNotificationCountKey,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
  useProfileQuery,
} from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { UPGRADE_HREF } from "@/utils/proUpgradePaths";
import { queryClient } from "@/lib/queryClient";
import { CO_CARE_ACCEPT_NEEDS_PRO_MESSAGE } from "@/services/coCare";
import { useAuthStore } from "@/stores/authStore";
import type { AppNotification } from "@/types/database";
import { Image } from "expo-image";
import type { Href } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { styles } from "@/screen-styles/notifications.styles";

const HIGH_FIVE = require("@/assets/images/high-five.png");

export default function NotificationsScreen() {
  const { push, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const userId = useAuthStore((s) => s.session?.user?.id);
  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useNotificationsQuery();
  const { data: profile } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);

  /** Only for pull-to-refresh UI — not `isRefetching` (true on focus invalidation / remount too). */
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refetch();
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: unreadNotificationCountKey(userId),
        });
      }
    } finally {
      setPullRefreshing(false);
    }
  }, [refetch, userId]);

  /** Badge (unread count) can update via polling while this screen’s list cache stays stale under global staleTime — refetch both on focus. */
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void queryClient.invalidateQueries({
        queryKey: notificationsKey(userId),
      });
      void queryClient.invalidateQueries({
        queryKey: unreadNotificationCountKey(userId),
      });
    }, [userId]),
  );
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllNotificationsReadMutation();
  const acceptInvite = useAcceptInviteMutation();
  const declineInvite = useDeclineInviteMutation();

  const unreadCount = notifications.filter((n) => !n.read).length;

  /** Row tap: open pet for non-invite notifications only. Co-care invites use Accept/Decline only. */
  const handlePress = useCallback(
    (n: AppNotification) => {
      if (n.type === "co_care_invite") return;
      if (n.type === "co_care_invite_requires_pro" && isPro) return;
      if (!n.read) markRead.mutate(n.id);
      if (n.type === "co_care_invite_requires_pro") {
        const href = (n.data as Record<string, unknown>)?.href as
          | string
          | undefined;
        push((href ?? UPGRADE_HREF) as Href);
        return;
      }
      if (n.type === "co_carer_activity_logged") {
        const href = (n.data as Record<string, unknown>)?.href as
          | string
          | undefined;
        if (href) {
          push(href as Href);
          return;
        }
      }
      const petId = (n.data as Record<string, unknown>)?.pet_id as
        | string
        | undefined;
      if (petId) {
        push(`/(logged-in)/pet/${petId}` as any);
      }
    },
    [markRead, push, isPro],
  );

  const handleAcceptInvite = useCallback(
    (n: AppNotification) => {
      const inviteId = (n.data as Record<string, unknown>)?.invite_id as
        | string
        | undefined;
      if (!inviteId) return;
      acceptInvite.mutate(inviteId, {
        onSuccess: () => {
          if (!n.read) markRead.mutate(n.id);
          Alert.alert("Accepted", "You are now co-caring for this pet!");
        },
        onError: (err) => {
          const msg = err.message ?? "Could not accept invite.";
          Alert.alert(
            msg === CO_CARE_ACCEPT_NEEDS_PRO_MESSAGE
              ? "Crittr Pro required"
              : "Error",
            msg,
          );
        },
      });
    },
    [acceptInvite, markRead],
  );

  const handleDeclineInvite = useCallback(
    (n: AppNotification) => {
      const inviteId = (n.data as Record<string, unknown>)?.invite_id as
        | string
        | undefined;
      if (!inviteId) return;
      declineInvite.mutate(inviteId, {
        onSuccess: () => {
          if (!n.read) markRead.mutate(n.id);
        },
        onError: (err) =>
          Alert.alert("Error", err.message ?? "Could not decline invite."),
      });
    },
    [declineInvite, markRead],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Notifications
        </Text>
        <View style={styles.navSideRight}>
          {unreadCount > 0 && (
            <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
              <Text style={styles.markAllText}>Read all</Text>
            </Pressable>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.orange} />
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.emptyScrollContent,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.orange}
              colors={[Colors.orange]}
            />
          }
        >
          <Image
            source={HIGH_FIVE}
            style={styles.emptyIllustration}
            contentFit="contain"
            accessibilityLabel="No notifications"
          />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.orange}
              colors={[Colors.orange]}
            />
          }
        >
          {notifications.map((n) => {
            const inviteId = (n.data as Record<string, unknown>)?.invite_id as
              | string
              | undefined;
            return (
              <NotificationRow
                key={n.id}
                notification={n}
                isPro={isPro}
                acceptPending={acceptInvite.isPending}
                acceptPendingForThis={
                  !!inviteId && acceptInvite.variables === inviteId
                }
                declinePending={declineInvite.isPending}
                declinePendingForThis={
                  !!inviteId && declineInvite.variables === inviteId
                }
                onPress={handlePress}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
