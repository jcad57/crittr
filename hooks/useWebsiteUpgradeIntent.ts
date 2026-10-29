import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { usePathname, useRootNavigationState, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { isCrittrProFromProfile } from "@/lib/crittrPro";
import { sessionGeneration } from "@/lib/sessionGeneration";
import {
  acknowledgeWebsiteUpgradeIntent,
  fetchWebsiteUpgradeIntent,
} from "@/services/websiteUpgradeIntent";

/** Runs after onboarding, without delaying app startup or changing entitlements. */
export function useWebsiteUpgradeIntent() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const hydrating = useAuthStore((s) => s.isHydrating);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const router = useRouter();
  const pathname = usePathname();
  const rootKey = useRootNavigationState()?.key;
  const presented = useRef(new Set<string>());

  useEffect(() => {
    if (!userId || hydrating || needsOnboarding || !rootKey) return;
    // Never interrupt checkout, an entitlement activation, or pet creation.
    if (/pro-checkout|welcome-to-pro|make-pro-yours|add-pet/.test(pathname)) return;
    let active = true;
    let inFlight = false;
    const generation = sessionGeneration();
    const isCurrent = () =>
      active &&
      generation === sessionGeneration() &&
      useAuthStore.getState().session?.user.id === userId &&
      !useAuthStore.getState().needsOnboarding;

    async function check() {
      if (inFlight || !isCurrent()) return;
      inFlight = true;
      try {
        const intent = await fetchWebsiteUpgradeIntent(userId!);
        if (!intent || !isCurrent()) return;
        const key = `${userId}:${intent.id}`;
        const alreadyPro = isCrittrProFromProfile(
          useAuthStore.getState().profile,
        );
        if (!alreadyPro && !presented.current.has(key)) {
          if (!pathname.includes("upgrade")) {
            // Acknowledge only when the upgrade route has actually mounted.
            router.push({
              pathname: "/(logged-in)/upgrade",
              params: {
                billing: intent.billing,
                fromOnboarding: "1",
                source: "website",
              },
            });
            return;
          }
          router.setParams({ billing: intent.billing, source: "website" });
          presented.current.add(key);
        }
        // Keep local presentation memory even if the ack is offline, preventing
        // the screen reopening as soon as the member taps “No thanks”.
        await acknowledgeWebsiteUpgradeIntent(userId!, intent.id);
      } catch {
        // A transient failure leaves the server intent pending for the next
        // foreground/navigation. The account remains usable offline.
      } finally {
        inFlight = false;
      }
    }
    void check();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, [userId, hydrating, needsOnboarding, rootKey, pathname, router]);
}
