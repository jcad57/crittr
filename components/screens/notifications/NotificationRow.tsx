import { styles } from "@/screen-styles/notifications.styles";
import { Colors } from "@/constants/colors";
import type { AppNotification } from "@/types/database";
import { notificationIcon, timeAgo } from "@/utils/notificationDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export type NotificationRowProps = {
  notification: AppNotification;
  isPro: boolean;
  acceptPending: boolean;
  acceptPendingForThis: boolean;
  declinePending: boolean;
  declinePendingForThis: boolean;
  onPress: (n: AppNotification) => void;
  onAccept: (n: AppNotification) => void;
  onDecline: (n: AppNotification) => void;
};

export function NotificationRow({
  notification: n,
  isPro,
  acceptPending,
  acceptPendingForThis,
  declinePending,
  declinePendingForThis,
  onPress,
  onAccept,
  onDecline,
}: NotificationRowProps) {
  const inviteId = (n.data as Record<string, unknown>)?.invite_id as
    | string
    | undefined;
  const showCoCareInviteActions =
    n.type === "co_care_invite" ||
    (n.type === "co_care_invite_requires_pro" && isPro);
  const isCoCareUpgradeNudge =
    n.type === "co_care_invite_requires_pro" && !isPro;
  const inviteSubmitting =
    showCoCareInviteActions &&
    !!inviteId &&
    ((acceptPending && acceptPendingForThis) ||
      (declinePending && declinePendingForThis));
  const acceptBusy = !!inviteId && acceptPending && acceptPendingForThis;
  const declineBusy = !!inviteId && declinePending && declinePendingForThis;
  const inviteButtonsLocked =
    !showCoCareInviteActions || !inviteId || inviteSubmitting;

  const rowInner = (
    <>
      <View style={[styles.iconWrap, !n.read && styles.iconWrapUnread]}>
        <MaterialCommunityIcons
          name={notificationIcon(n.type, isPro) as any}
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
        {showCoCareInviteActions && !n.read && (
          <View style={styles.inviteActions}>
            <Pressable
              style={[
                styles.acceptBtn,
                inviteButtonsLocked && styles.inviteBtnLocked,
              ]}
              onPress={() => onAccept(n)}
              disabled={inviteButtonsLocked}
            >
              {acceptBusy ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept</Text>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.declineBtn,
                inviteButtonsLocked && styles.inviteBtnLocked,
              ]}
              onPress={() => onDecline(n)}
              disabled={inviteButtonsLocked}
            >
              {declineBusy ? (
                <ActivityIndicator color={Colors.orange} size="small" />
              ) : (
                <Text style={styles.declineBtnText}>Decline</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
      {!n.read && <View style={styles.unreadDot} />}
    </>
  );

  if (showCoCareInviteActions) {
    return (
      <View style={[styles.row, !n.read && styles.rowUnread]}>{rowInner}</View>
    );
  }

  if (isCoCareUpgradeNudge) {
    return (
      <Pressable
        style={[styles.row, !n.read && styles.rowUnread]}
        onPress={() => onPress(n)}
        accessibilityRole="button"
        accessibilityLabel="Open Crittr Pro upgrade"
      >
        {rowInner}
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.row, !n.read && styles.rowUnread]}
      onPress={() => onPress(n)}
    >
      {rowInner}
    </Pressable>
  );
}
