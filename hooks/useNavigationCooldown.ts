import { useCallback, useRef } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";

const SAME_HREF_MS = 450;
const CLEANUP_THRESHOLD = 50;

function pruneStaleEntries(map: Map<string, number>, now: number) {
  for (const [key, ts] of map) {
    if (now - ts > SAME_HREF_MS * 2) map.delete(key);
  }
}

/**
 * Wraps `router.push` / `router.replace` so duplicate navigations to the same
 * route (e.g. double-tapping a list row) do not stack multiple screens.
 */
export function useNavigationCooldown() {
  const router = useRouter();
  const lastAtByKey = useRef<Map<string, number>>(new Map());

  const push = useCallback(
    (href: Href) => {
      const key = `p:${String(href)}`;
      const now = Date.now();
      const prev = lastAtByKey.current.get(key);
      if (prev !== undefined && now - prev < SAME_HREF_MS) return;
      lastAtByKey.current.set(key, now);
      if (lastAtByKey.current.size > CLEANUP_THRESHOLD) {
        pruneStaleEntries(lastAtByKey.current, now);
      }
      router.push(href);
    },
    [router],
  );

  const replace = useCallback(
    (href: Href) => {
      const key = `r:${String(href)}`;
      const now = Date.now();
      const prev = lastAtByKey.current.get(key);
      if (prev !== undefined && now - prev < SAME_HREF_MS) return;
      lastAtByKey.current.set(key, now);
      if (lastAtByKey.current.size > CLEANUP_THRESHOLD) {
        pruneStaleEntries(lastAtByKey.current, now);
      }
      router.replace(href);
    },
    [router],
  );

  return { push, replace, router };
}
