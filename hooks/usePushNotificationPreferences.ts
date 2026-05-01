import { profileQueryKey } from "@/hooks/queries/queryKeys";
import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import type { Profile } from "@/types/database";
import type { NotificationCategoryPrefs } from "@/utils/pushNotificationPreferences";
import {
  defaultNotificationCategoryPrefs,
  mergeNotificationColumnsPreferLiveCache,
  notificationPrefsDelta,
  notificationPrefsFromProfile,
} from "@/utils/pushNotificationPreferences";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";

export type { NotificationCategoryPrefs };

const SAVE_DEBOUNCE_MS = 500;

type OptimisticCtx = {
  previousQuery: Profile | null | undefined;
  previousAuth: Profile | null;
  applied: boolean;
};

type PersistMutateAsyncFn = (
  variables: Partial<NotificationCategoryPrefs>,
) => Promise<Profile | null>;

export function usePushNotificationPreferences() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfileQuery();

  const mutationRef = useRef<PersistMutateAsyncFn | null>(null);
  const pendingPatchRef = useRef<Partial<NotificationCategoryPrefs>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistChainRef = useRef(Promise.resolve());

  const prefs = useMemo(
    () =>
      profile
        ? notificationPrefsFromProfile(profile)
        : defaultNotificationCategoryPrefs(),
    [profile],
  );

  const mergePendingPatch = useCallback(
    (patch: Partial<NotificationCategoryPrefs>) => {
      pendingPatchRef.current = {
        ...pendingPatchRef.current,
        ...patch,
      };
    },
    [],
  );

  const persistUntilEmpty = useCallback(async () => {
    if (!userId) return;
    const mutateAsync = mutationRef.current;
    if (!mutateAsync) return;

    while (Object.keys(pendingPatchRef.current).length > 0) {
      const batch = { ...pendingPatchRef.current };
      pendingPatchRef.current = {};

      if (Object.keys(batch).length === 0) return;

      await mutateAsync(batch);
    }
  }, [userId]);

  const enqueuePersistDrain = useCallback(() => {
    if (!userId) return;
    persistChainRef.current = persistChainRef.current
      .then(() => persistUntilEmpty())
      .catch((err: unknown) =>
        console.warn("[usePushNotificationPreferences] persist:", err),
      );
  }, [persistUntilEmpty, userId]);

  const applyNotificationPatchLocally = useCallback(
    (patch: Partial<NotificationCategoryPrefs>) => {
      if (!userId || Object.keys(patch).length === 0) return false;

      const previousAuth = useAuthStore.getState().profile;
      const qcPrev =
        queryClient.getQueryData<Profile | null>(profileQueryKey(userId)) ??
        undefined;
      const base: Profile | null =
        qcPrev ?? (previousAuth?.id === userId ? previousAuth : null);

      if (!base) return false;

      const optimistic: Profile = { ...base, ...patch };
      queryClient.setQueryData(profileQueryKey(userId), optimistic);
      if (previousAuth?.id === userId) {
        useAuthStore.getState().replaceProfileSnapshot(optimistic);
      }

      return true;
    },
    [queryClient, userId],
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
    onError: (_err, variables, ctx) => {
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

      mergePendingPatch(variables);
      applyNotificationPatchLocally(variables);
      enqueuePersistDrain();
    },
    onSuccess: (serverProfile, _vars) => {
      if (!userId || !serverProfile) return;

      const liveBeforeSet = queryClient.getQueryData<Profile | null>(
        profileQueryKey(userId),
      );
      const merged = mergeNotificationColumnsPreferLiveCache(
        serverProfile,
        liveBeforeSet,
      );

      queryClient.setQueryData(profileQueryKey(userId), merged);

      const authProfile = useAuthStore.getState().profile;
      if (authProfile?.id === userId) {
        useAuthStore.getState().replaceProfileSnapshot(merged);
      }

      const drift = notificationPrefsDelta(
        notificationPrefsFromProfile(merged),
        notificationPrefsFromProfile(serverProfile),
      );
      if (Object.keys(drift).length > 0) {
        mergePendingPatch(drift);
        enqueuePersistDrain();
      }
    },
  });

  mutationRef.current = mutation.mutateAsync;

  const scheduleDebouncedSave = useCallback(() => {
    if (!userId) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      enqueuePersistDrain();
    }, SAVE_DEBOUNCE_MS);
  }, [enqueuePersistDrain, userId]);

  const updatePrefs = useCallback(
    async (patch: Partial<NotificationCategoryPrefs>) => {
      if (!userId) throw new Error("Not signed in");
      mergePendingPatch(patch);
      applyNotificationPatchLocally(patch);
      scheduleDebouncedSave();
    },
    [
      applyNotificationPatchLocally,
      mergePendingPatch,
      scheduleDebouncedSave,
      userId,
    ],
  );

  const flushPending = useCallback(async () => {
    if (!userId) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    enqueuePersistDrain();
    await persistChainRef.current;
  }, [enqueuePersistDrain, userId]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (Object.keys(pendingPatchRef.current).length > 0) {
        enqueuePersistDrain();
      }
    };
  }, [enqueuePersistDrain]);

  return {
    prefs,
    loading: isLoading && !profile,
    updatePrefs,
    flushPending,
    isSaving: mutation.isPending,
  };
}
