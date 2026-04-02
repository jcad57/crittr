import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  notificationsKey,
  unreadNotificationCountKey,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import type { AppNotification } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function notificationIcon(type: string): string {
  switch (type) {
    case "co_care_invite":
      return "account-plus-outline";
    case "co_care_accepted":
      return "account-check-outline";
    case "co_care_removed":
      return "account-remove-outline";
    default:
      return "bell-outline";
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const { push, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const userId = useAuthStore((s) => s.session?.user?.id);
  const {
    data: notifications = [],
    isLoading,
    refetch,
    isRefetching,
  } = useNotificationsQuery();

  const onRefresh = useCallback(async () => {
    await refetch();
    if (userId) {
      void queryClient.invalidateQueries({
        queryKey: unreadNotificationCountKey(userId),
      });
    }
  }, [refetch, userId]);

  /** Badge (unread count) can update via polling while this screen’s list cache stays stale under global staleTime — refetch both on focus. */
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: notificationsKey(userId) });
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

  const handlePress = useCallback(
    (n: AppNotification) => {
      if (!n.read) markRead.mutate(n.id);
      const petId = (n.data as Record<string, unknown>)?.pet_id as
        | string
        | undefined;
      if (petId) {
        push(`/(logged-in)/pet/${petId}` as any);
      }
    },
    [markRead, push],
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
        onError: (err) =>
          Alert.alert("Error", err.message ?? "Could not accept invite."),
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
              refreshing={isRefetching}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.orange}
              colors={[Colors.orange]}
            />
          }
        >
          <MaterialCommunityIcons
            name="bell-check-outline"
            size={48}
            color={Colors.gray300}
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
              refreshing={isRefetching}
              onRefresh={() => void onRefresh()}
              tintColor={Colors.orange}
              colors={[Colors.orange]}
            />
          }
        >
          {notifications.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.row, !n.read && styles.rowUnread]}
              onPress={() => handlePress(n)}
            >
              <View
                style={[
                  styles.iconWrap,
                  !n.read && styles.iconWrapUnread,
                ]}
              >
                <MaterialCommunityIcons
                  name={notificationIcon(n.type) as any}
                  size={20}
                  color={!n.read ? Colors.orange : Colors.gray500}
                />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{n.title}</Text>
                {n.body ? (
                  <Text style={styles.rowBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                ) : null}
                <Text style={styles.rowTime}>{timeAgo(n.created_at)}</Text>
                {n.type === "co_care_invite" && !n.read && (
                  <View style={styles.inviteActions}>
                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptInvite(n)}
                    >
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </Pressable>
                    <Pressable
                      style={styles.declineBtn}
                      onPress={() => handleDeclineInvite(n)}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              {!n.read && <View style={styles.unreadDot} />}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  navBack: { fontFamily: Font.uiSemiBold, fontSize: 16, color: Colors.orange },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  markAllText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.orange,
  },
  scroll: { flex: 1 },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  emptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  rowUnread: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange + "30",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  iconWrapUnread: {
    backgroundColor: Colors.white,
  },
  rowContent: { flex: 1, marginRight: 8 },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowBody: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  rowTime: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray400,
    marginTop: 4,
  },
  inviteActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  acceptBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.white,
  },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  declineBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
    marginTop: 6,
  },
});
