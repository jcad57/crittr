import {
  notificationsKey,
  unreadNotificationCountKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";

export function useMarkNotificationReadMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: notificationsKey(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: unreadNotificationCountKey(userId),
        });
      }
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: notificationsKey(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: unreadNotificationCountKey(userId),
        });
      }
    },
  });
}
