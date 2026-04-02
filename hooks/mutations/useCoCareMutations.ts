import {
  coCarersForPetKey,
  notificationsKey,
  pendingInvitesKey,
  petDetailsQueryKey,
  petsQueryKey,
  sentInvitesForPetKey,
  unreadNotificationCountKey,
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
    mutationFn: (input: { email: string; permissions: CoCarePermissions }) =>
      sendCoCareInvite(petId, userId!, input.email, input.permissions),
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
    onSuccess: async (result) => {
      await useAuthStore.getState().refreshAuthSession();
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
      /** Owner’s device may still cache sent invites as pending until refetched. */
      if (result?.petId) {
        void queryClient.invalidateQueries({
          queryKey: sentInvitesForPetKey(result.petId),
        });
        void queryClient.invalidateQueries({
          queryKey: coCarersForPetKey(result.petId),
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
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: coCarersForPetKey(petId),
      });
      // Invalidate every cached permission snapshot for this pet (all users on this device).
      void queryClient.invalidateQueries({
        queryKey: ["petPermissions", petId],
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
    onSuccess: async () => {
      void queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["petPermissions", petId],
      });
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: petsQueryKey(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: notificationsKey(userId),
        });
        await useAuthStore.getState().refreshAuthSession();
      }
      void queryClient.invalidateQueries({
        queryKey: coCarersForPetKey(petId),
      });
    },
  });
}
