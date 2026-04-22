import { profileQueryKey } from "@/hooks/queries/queryKeys";
import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types/database";
import type { NotificationCategoryPrefs } from "@/utils/pushNotificationPreferences";
import {
  defaultNotificationCategoryPrefs,
  notificationPrefsFromProfile,
} from "@/utils/pushNotificationPreferences";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export type { NotificationCategoryPrefs };

type OptimisticCtx = {
  previousQuery: Profile | null | undefined;
  previousAuth: Profile | null;
  applied: boolean;
};

export function usePushNotificationPreferences() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfileQuery();

  const prefs = useMemo(
    () =>
      profile
        ? notificationPrefsFromProfile(profile)
        : defaultNotificationCategoryPrefs(),
    [profile],
  );

  const mutation = useMutation<
    Profile | null,
    Error,
    Partial<NotificationCategoryPrefs>,
    OptimisticCtx
  >({
    mutationFn: async (next) => {
      if (!userId) throw new Error("Not signed in");
      return updateProfile(userId, next);
    },
    onMutate: async (next) => {
      const previousAuth = useAuthStore.getState().profile;

      if (!userId) {
        return { previousQuery: undefined, previousAuth, applied: false };
      }

      await queryClient.cancelQueries({
        queryKey: profileQueryKey(userId),
      });

      const previousQuery = queryClient.getQueryData<Profile | null>(
        profileQueryKey(userId),
      );

      const base: Profile | null | undefined =
        previousQuery ??
        (previousAuth?.id === userId ? previousAuth : null);

      if (!base) {
        return { previousQuery, previousAuth, applied: false };
      }

      const optimistic: Profile = { ...base, ...next };
      queryClient.setQueryData(profileQueryKey(userId), optimistic);
      if (previousAuth?.id === userId) {
        useAuthStore.getState().replaceProfileSnapshot(optimistic);
      }

      return { previousQuery, previousAuth, applied: true };
    },
    onError: (_err, _next, ctx) => {
      if (!userId || !ctx || !ctx.applied) return;
      if (ctx.previousQuery !== undefined) {
        queryClient.setQueryData(
          profileQueryKey(userId),
          ctx.previousQuery,
        );
      } else {
        queryClient.removeQueries({
          queryKey: profileQueryKey(userId),
          exact: true,
        });
      }
      useAuthStore.getState().replaceProfileSnapshot(ctx.previousAuth);
    },
    onSuccess: (serverProfile) => {
      if (!userId || !serverProfile) return;
      queryClient.setQueryData(profileQueryKey(userId), serverProfile);
      const authProfile = useAuthStore.getState().profile;
      if (authProfile?.id === userId) {
        useAuthStore.getState().replaceProfileSnapshot(serverProfile);
      }
    },
  });

  return {
    prefs,
    loading: isLoading && !profile,
    updatePrefs: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
