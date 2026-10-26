import {
  fetchNotifications,
  fetchUnreadNotificationCount,
} from "@/services/notifications";
import { useAuthStore } from "@/stores/authStore";
import type { AppNotification } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { notificationsKey, unreadNotificationCountKey } from "@/lib/query/keys";

/**
 * Both of these are kept current by the realtime `notifications` subscription in
 * `useLoggedInQueryBootstrap`, which invalidates them the moment a row changes.
 * The short stale window is a backstop for a dropped socket, not the primary
 * update path — refetching on every mount made opening the notifications screen
 * wait on the network even though the correct list was already in hand.
 */
const NOTIFICATION_STALE_MS = 30 * 1000;

export function useNotificationsQuery(): UseQueryResult<
  AppNotification[],
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useQuery({
    queryKey: notificationsKey(userId ?? ""),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    staleTime: NOTIFICATION_STALE_MS,
  });
}

export function useUnreadNotificationCountQuery(): UseQueryResult<
  number,
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useQuery({
    queryKey: unreadNotificationCountKey(userId ?? ""),
    queryFn: () => fetchUnreadNotificationCount(userId!),
    enabled: !!userId,
    staleTime: NOTIFICATION_STALE_MS,
    /**
     * The badge is on the dashboard, so a 30s poll ran for as long as the app
     * was open. Realtime already covers it; this only catches a dead socket.
     */
    refetchInterval: 5 * 60 * 1000,
  });
}
