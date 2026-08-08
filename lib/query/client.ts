import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      /**
       * Only what is still in the cache gets written to disk, so collecting
       * unobserved queries after 30 minutes meant a long session steadily
       * emptied the snapshot the next cold start restores from.
       */
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      /** Exponential backoff capped at 10s so a flaky socket doesn't wait 30s+ to retry. */
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: true,
      /** Auto-recover when the network comes back (e.g. exiting an iOS tunnel / Wi-Fi drop). */
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
