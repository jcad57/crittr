import { fetchSubscriptionDetails } from "@/services/stripeSubscription";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { subscriptionDetailsQueryKey } from "./queryKeys";

export function useSubscriptionDetailsQuery(enabled: boolean) {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery({
    queryKey: subscriptionDetailsQueryKey(userId ?? ""),
    queryFn: fetchSubscriptionDetails,
    enabled: Boolean(userId) && enabled,
  });
}
