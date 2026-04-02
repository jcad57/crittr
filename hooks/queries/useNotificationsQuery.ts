import {
  fetchNotifications,
  fetchUnreadNotificationCount,
} from "@/services/notifications";
import { useAuthStore } from "@/stores/authStore";
import type { AppNotification } from "@/types/database";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { notificationsKey, unreadNotificationCountKey } from "./queryKeys";

export function useNotificationsQuery(): UseQueryResult<
  AppNotification[],
  Error
> {
  const userId = useAuthStore((s) => s.session?.user?.id);
  return useQuery({
    queryKey: notificationsKey(userId ?? ""),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    /** Global default staleTime is 5m; unread count polls every 30s so the badge can be ahead of a stale list. */
    staleTime: 0,
    refetchOnMount: "always",
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
    refetchInterval: 30_000,
    /** Same reason as notifications list: stay aligned when opening the app or returning to dashboard. */
    staleTime: 0,
    refetchOnMount: "always",
  });
}
