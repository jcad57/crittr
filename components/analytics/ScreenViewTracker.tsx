import { trackScreenView } from "@/lib/analytics";
import { usePathname } from "expo-router";
import { useEffect } from "react";

/**
 * Expo Router screens are not UIViewControllers, so native automatic screen
 * reporting is noisy. This logs the route path Firebase can use in funnels.
 */
export default function ScreenViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackScreenView(pathname);
  }, [pathname]);

  return null;
}
