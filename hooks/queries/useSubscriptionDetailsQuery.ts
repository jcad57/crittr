import { fetchSubscriptionDetails } from "@/services/iapSubscription";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { subscriptionDetailsQueryKey } from "./queryKeys";

export function useSubscriptionDetailsQuery(enabled: boolean) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery({
    queryKey: subscriptionDetailsQueryKey(userId ?? ""),
    queryFn: fetchSubscriptionDetails,
    enabled: Boolean(userId) && enabled,
    /** Subscription state can update outside the app (Apple ID/Play Store cancel); refetch on focus. */
    staleTime: 0,
  });
}
