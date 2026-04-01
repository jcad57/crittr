import {
  coCarersForPetKey,
  pendingInvitesKey,
  petsQueryKey,
  sentInvitesForPetKey,
  unreadNotificationCountKey,
  notificationsKey,
  userPetPermissionsKey,
} from "@/hooks/queries/queryKeys";
import { queryClient } from "@/lib/queryClient";
import {
  acceptInvite,
  declineInvite,
  leaveCoCare,
  removeCoCarer,
  revokeInvite,
  sendCoCareInvite,
  updateCoCarerPermissions,
} from "@/services/coCare";
import { useAuthStore } from "@/stores/authStore";
import type { CoCarePermissions } from "@/types/database";
import { useMutation } from "@tanstack/react-query";

export function useSendInviteMutation(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (email: string) => sendCoCareInvite(petId, userId!, email),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: sentInvitesForPetKey(petId),
      });
    },
  });
}

export function useAcceptInviteMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (inviteId: string) => acceptInvite(inviteId, userId!),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: pendingInvitesKey(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: petsQueryKey(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: notificationsKey(userId),
        });
      }
    },
  });
}

export function useDeclineInviteMutation() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: (inviteId: string) => declineInvite(inviteId),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: pendingInvitesKey(userId),
        });
      }
    },
  });
}

export function useRevokeInviteMutation(petId: string) {
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: sentInvitesForPetKey(petId),
      });
    },
  });
}

export function useUpdatePermissionsMutation(petId: string) {
  return useMutation({
    mutationFn: ({
      coCarerUserId,
      permissions,
    }: {
      coCarerUserId: string;
      permissions: CoCarePermissions;
    }) => updateCoCarerPermissions(petId, coCarerUserId, permissions),
    onSuccess: (_, { coCarerUserId }) => {
      void queryClient.invalidateQueries({
        queryKey: coCarersForPetKey(petId),
      });
      void queryClient.invalidateQueries({
        queryKey: userPetPermissionsKey(petId, coCarerUserId),
      });
    },
  });
}

export function useRemoveCoCarerMutation(petId: string) {
  return useMutation({
    mutationFn: (coCarerUserId: string) => removeCoCarer(petId, coCarerUserId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: coCarersForPetKey(petId),
      });
    },
  });
}

export function useLeaveCoCare(petId: string) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useMutation({
    mutationFn: () => leaveCoCare(petId, userId!),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: petsQueryKey(userId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: coCarersForPetKey(petId),
      });
    },
  });
}
