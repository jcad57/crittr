import { deferSessionWork } from "@/lib/deferSessionWork";
import {
  healthSnapshotKey,
  notificationsKey,
  pendingInvitesKey,
  petsQueryKey,
  profileQueryKey,
  unreadNotificationCountKey,
} from "@/lib/query/keys";
import { usePetsQuery } from "@/hooks/queries/usePetsQuery";
import { useLocalCalendarYmd } from "@/hooks/useLocalCalendarYmd";
import { prefetchLoggedInSessionData } from "@/lib/prefetchSessionData";
import { queryClient } from "@/lib/query/client";
import { syncTodayVetVisitMirrorsToActivities } from "@/services/vetVisitActivityMirror";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { useEffect } from "react";
import { Platform } from "react-native";

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

    return deferSessionWork(() => syncTodayVetVisitMirrorsToActivities(userId));
  }, [userId, localYmd]);


  useEffect(() => {
    if (!userId) return;

    const { profile } = useAuthStore.getState();
    if (profile) {
      queryClient.setQueryData(profileQueryKey(userId), profile);
    }

    /**
     * Normally `authStore` has already started these as soon as the session
     * resolved. Repeating them here is a no-op while that data is fresh, and
     * covers the paths that reach the logged-in shell without a resolve
     * (finishing onboarding, switching accounts).
     */
    void prefetchLoggedInSessionData(userId);
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

          // OS banners come from the durable server queue, avoiding duplicate Realtime alerts.

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
