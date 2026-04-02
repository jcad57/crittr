import { useCallback, useRef } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";

/**
 * Ignores a second navigation to the same href within this window (rapid double-taps).
 */
const SAME_HREF_MS = 450;

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
      router.replace(href);
    },
    [router],
  );

  return { push, replace, router };
}
