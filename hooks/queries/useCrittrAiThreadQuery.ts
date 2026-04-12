import { crittrAiThreadKey } from "@/hooks/queries/queryKeys";
import { fetchCrittrAiThread } from "@/services/crittrAi";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";

export function useCrittrAiThreadQuery() {
  const userId = useAuthStore((s) => s.session?.user?.id);

  return useQuery({
    queryKey: crittrAiThreadKey(userId ?? ""),
    queryFn: () => fetchCrittrAiThread(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
