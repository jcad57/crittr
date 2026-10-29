import { useProfileQuery } from "@/hooks/queries/useProfileQuery";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNonProInterstitial } from "@/hooks/useNonProInterstitial";
import { useAuthStore } from "@/stores/authStore";
import { usePathname } from "expo-router";
import { useEffect } from "react";

/** Consume explicit existing-account logins once the signed-in dashboard is ready. */
export default function LoginInterstitialManager() {
  const pendingUserId = useAuthStore((s) => s.pendingLoginAdUserId);
  const userId = useAuthStore((s) => s.session?.user.id);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const { data: profile } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const pathname = usePathname();
  const { canShowAds, showThen } = useNonProInterstitial(
    "existing_user_login", pathname === "/dashboard",
  );

  useEffect(() => {
    if (!pendingUserId) return;
    if (pendingUserId !== userId || needsOnboarding || isPro) {
      useAuthStore.setState({ pendingLoginAdUserId: null });
      return;
    }
    if (!canShowAds) return;
    // Consume before asynchronous loading to dedupe renders and Strict Mode effects.
    useAuthStore.setState({ pendingLoginAdUserId: null });
    void showThen(() => {});
  }, [pendingUserId, userId, needsOnboarding, isPro, canShowAds, showThen]);

  return null;
}
