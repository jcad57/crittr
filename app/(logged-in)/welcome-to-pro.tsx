import { useCallback, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProOnboardingView } from "@/components/pro/ProOnboardingView";
import { ProFlowPage } from "@/components/pro/flow/ProFlowUi";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { trackProEvent } from "@/lib/proEvents";
import { markProOnboardingCompleted } from "@/lib/proEngagementPersistence";
import { useAuthStore } from "@/stores/authStore";

export default function WelcomeToProScreen() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { runWithProOrUpgrade } = useProGateNavigation();
  useEffect(() => { trackProEvent("pro_onboarding_started"); }, []);
  const skip = useCallback(() => {
    const uid = useAuthStore.getState().session?.user?.id;
    if (uid) void markProOnboardingCompleted(uid).catch(() => {});
    trackProEvent("pro_onboarding_skipped", { step: "welcome" });
    router.replace("/(logged-in)/(tabs)/dashboard");
  }, [router]);
  const start = () => {
    void runWithProOrUpgrade(() => {
      trackProEvent("pro_onboarding_step_completed", { step: "welcome" });
      router.replace({ pathname: "/(logged-in)/make-pro-yours", params: returnTo === "subscriptions" || returnTo === "settings" ? { returnTo } : {} });
    });
  };
  return <ProFlowPage onBack={skip} brand={false}><ProOnboardingView onContinue={start} onSkip={skip} /></ProFlowPage>;
}
