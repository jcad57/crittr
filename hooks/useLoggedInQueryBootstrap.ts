import { prefetchPetsAndDetails } from "@/hooks/queries/prefetchPetsAndDetails";
import {
  healthSnapshotKey,
  notificationsKey,
  pendingInvitesKey,
  petsQueryKey,
  profileQueryKey,
  unreadNotificationCountKey,
} from "@/hooks/queries/queryKeys";
import { usePetsQuery } from "@/hooks/queries/usePetsQuery";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { fetchOwnerHealthSnapshot } from "@/services/health";
import { queryClient } from "@/lib/queryClient";
import { syncTodayVetVisitMirrorsToActivities } from "@/lib/vetVisitActivityMirror";
import { supabase } from "@/lib/supabase";
import { syncExpoPushTokenToSupabase } from "@/services/pushTokens";
import { fetchProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

/**
 * Warm TanStack Query cache on mount for the logged-in session:
 * - Hydrates `profile` from Zustand (auth) so React Query matches client state.
 * - Prefetches profile + pets list + each pet’s details (same pattern as `usePetsQuery`).
 */
export function useLoggedInQueryBootstrap() {
  const userId = useAuthStore((s) => s.session?.user?.id);
  const localYmd = useLocalCalendarYmd();

  useEffect(() => {
    if (!userId) return;

    void syncTodayVetVisitMirrorsToActivities(userId).catch((e) => {
      if (__DEV__) console.warn("[vetVisitMirror] bootstrap", e);
    });
  }, [userId, localYmd]);

  /** Register Expo push token for remote co-care alerts (no-op if permission denied). */
  useEffect(() => {
    if (!userId || Platform.OS === "web") return;
    void syncExpoPushTokenToSupabase(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const { profile } = useAuthStore.getState();
    if (profile) {
      queryClient.setQueryData(profileQueryKey(userId), profile);
    }

    void queryClient.prefetchQuery({
      queryKey: profileQueryKey(userId),
      queryFn: () => fetchProfile(userId),
    });

    void prefetchPetsAndDetails(queryClient, userId);

    void queryClient.prefetchQuery({
      queryKey: healthSnapshotKey(userId),
      queryFn: () => fetchOwnerHealthSnapshot(userId),
    });
  }, [userId]);

  /**
   * Keep the active-pet selection in sync with whatever the pets query currently holds.
   * The co-care realtime subscription below invalidates `petsQueryKey`, which triggers
   * a refetch of this query — so any realtime membership change flows through here.
   */
  const { data: petsList } = usePetsQuery();
  useEffect(() => {
    if (!petsList) return;
    usePetStore.getState().initActivePetFromList(petsList);
  }, [petsList]);

  /** When co-care rows change (removed / invited), refresh pets + auth so UI and permissions stay in sync. */
  useEffect(() => {
    if (!userId) return;

    /**
     * No `filter` on postgres_changes: filtered subs can trigger
     * "mismatch between server and client bindings" on hosted Realtime (supabase-js #1917).
     * RLS still applies — users only receive changes for rows they may access.
     */
    const channel = supabase
      .channel(`pet_co_carers_bootstrap:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pet_co_carers",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: petsQueryKey(userId),
          });
          void queryClient.invalidateQueries({
            queryKey: healthSnapshotKey(userId),
          });
          void queryClient.invalidateQueries({
            queryKey: pendingInvitesKey(userId),
          });
          void queryClient.invalidateQueries({ queryKey: ["coCarers"] });
          void queryClient.invalidateQueries({ queryKey: ["sentInvites"] });
          void queryClient.invalidateQueries({
            predicate: (query) => {
              const k = query.queryKey;
              return (
                Array.isArray(k) &&
                k[0] === "petPermissions" &&
                k[2] === userId
              );
            },
          });
          void useAuthStore.getState().refreshAuthSession();
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && err && __DEV__) {
          console.warn("[Realtime] pet_co_carers channel:", err.message);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  /** New in-app notification rows (e.g. co-care invite): refresh list + badge; optional OS banner when backgrounded. */
  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === "web") return;

    const channel = supabase
      .channel(`notifications_bootstrap:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const eventType = (payload as { eventType?: string }).eventType;
          const rowNew = payload.new as {
            user_id?: string;
            title?: string;
            body?: string | null;
            data?: Record<string, unknown>;
          } | null;
          const rowOld = payload.old as { user_id?: string } | null;
          const uid = rowNew?.user_id ?? rowOld?.user_id;
          if (uid !== userId) return;

          void queryClient.invalidateQueries({
            queryKey: notificationsKey(userId),
          });
          void queryClient.invalidateQueries({
            queryKey: unreadNotificationCountKey(userId),
          });

          if (
            eventType === "INSERT" &&
            rowNew &&
            AppState.currentState !== "active"
          ) {
            /** Co-care activity alerts use Expo push from the edge function to avoid doubling up. */
            const nType = (rowNew as { type?: string }).type;
            if (nType === "co_carer_activity_logged") return;

            const href = rowNew.data?.href;
            void Notifications.scheduleNotificationAsync({
              content: {
                title: rowNew.title ?? "Crittr",
                body: rowNew.body?.trim() || "You have a new notification.",
                data:
                  typeof href === "string"
                    ? { href }
                    : rowNew.data ?? undefined,
              },
              trigger: null,
            }).catch(() => {});
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" && err && __DEV__) {
          console.warn("[Realtime] notifications channel:", err.message);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
