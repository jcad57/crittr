import { fetchSubscriptionDetails } from "@/services/iapSubscription";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { subscriptionDetailsQueryKey } from "@/lib/query/keys";

export function useSubscriptionDetailsQuery() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery({
    queryKey: subscriptionDetailsQueryKey(userId ?? ""),
    queryFn: () => {
      const profile = useAuthStore.getState().profile;
      return fetchSubscriptionDetails(
        userId!,
        profile?.id === userId ? profile : null,
      );
    },
    enabled: Boolean(userId),
    /** Subscription state can update outside the app (Apple ID/Play Store cancel); refetch on focus. */
    staleTime: 0,
  });
}
