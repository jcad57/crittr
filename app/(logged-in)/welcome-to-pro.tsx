import {
  ProOnboardingView,
  proOnboardingStyles,
  type ProOnboardingExpandKind,
  type ProOnboardingStep,
} from "@/components/pro/ProOnboardingView";
import {
  useCoCarersForPetQuery,
  usePetDetailsQuery,
  usePetMedicalRecordsQuery,
  usePetsQuery,
  useSentInvitesForPetQuery,
} from "@/hooks/queries";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { trackProEvent } from "@/lib/proEvents";
import {
  loadProEngagementState,
  markProOnboardingCompleted,
} from "@/lib/proEngagementPersistence";
import { useAuthStore } from "@/stores/authStore";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import type { Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/theme/colors";

function nextAfterWelcome(opts: {
  showCocare: boolean;
  expandKind: ProOnboardingExpandKind | null;
}): ProOnboardingStep {
  if (opts.showCocare) return "cocare";
  if (opts.expandKind) return "expand";
  return "done";
}

function nextAfterCocare(
  expandKind: ProOnboardingExpandKind | null,
): ProOnboardingStep {
  return expandKind ? "expand" : "done";
}

export default function WelcomeToProScreen() {
  const insets = useSafeAreaInsets();
  const { replace } = useNavigationCooldown();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const [step, setStep] = useState<ProOnboardingStep>("welcome");
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);

  const { data: pets, isPending: petsPending } = usePetsQuery();

  const ownedLiving = useMemo(() => {
    if (!pets) return [];
    return pets.filter(
      (p) => p.role === "owner" && isPetActiveForDashboard(p),
    );
  }, [pets]);

  const firstPet = ownedLiving[0] ?? null;
  const firstPetId = firstPet?.id ?? null;

  const { data: details, isPending: detailsPending } =
    usePetDetailsQuery(firstPetId);
  const { data: medical, isPending: medicalPending } =
    usePetMedicalRecordsQuery(firstPetId ?? undefined);
  const { data: coCarers, isPending: carersPending } =
    useCoCarersForPetQuery(firstPetId);
  const { data: sentInvites, isPending: invitesPending } =
    useSentInvitesForPetQuery(firstPetId);

  const planPending =
    !!firstPetId &&
    (petsPending ||
      detailsPending ||
      medicalPending ||
      carersPending ||
      invitesPending);

  const hasCocareAlready =
    (coCarers?.length ?? 0) > 0 ||
    (sentInvites?.some((i) => i.status === "pending") ?? false);

  const showCocare = firstPetId != null && !hasCocareAlready;

  const expandKind: ProOnboardingExpandKind | null = useMemo(() => {
    if (ownedLiving.length === 1) return "addPet";
    if (firstPetId && (medical?.records.length ?? 0) === 0) return "records";
    if (firstPetId && (details?.medications.length ?? 0) >= 1) {
      return "medications";
    }
    return "crittrAi";
  }, [ownedLiving.length, firstPetId, medical?.records.length, details?.medications.length]);

  useEffect(() => {
    if (!userId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void Promise.race([
      loadProEngagementState(userId),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 2_500);
      }),
    ]).then((state) => {
      if (cancelled) return;
      if (state?.onboardingCompleted) {
        replace("/(logged-in)/dashboard" as Href);
        return;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [replace, userId]);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    trackProEvent("pro_onboarding_started");
  }, [ready]);

  const finish = useCallback(
    async (event: "pro_onboarding_completed" | "pro_onboarding_skipped") => {
      if (userId) await markProOnboardingCompleted(userId);
      trackProEvent(event, { step });
      replace("/(logged-in)/dashboard" as Href);
    },
    [replace, step, userId],
  );

  const goHome = useCallback(() => {
    void finish("pro_onboarding_completed");
  }, [finish]);

  const onWelcomeContinue = useCallback(() => {
    if (planPending) return;
    trackProEvent("pro_onboarding_step_completed", { step: "welcome" });
    setStep(nextAfterWelcome({ showCocare, expandKind }));
  }, [expandKind, planPending, showCocare]);

  const onCocare = useCallback(() => {
    trackProEvent("pro_onboarding_step_completed", { step: "cocare" });
    if (userId) void markProOnboardingCompleted(userId);
    if (firstPetId) {
      replace(`/(logged-in)/pet/${firstPetId}/invite-care` as Href);
      return;
    }
    setStep(nextAfterCocare(expandKind));
  }, [expandKind, firstPetId, replace, userId]);

  const onCocareSkip = useCallback(() => {
    trackProEvent("pro_onboarding_skipped", { step: "cocare" });
    setStep(nextAfterCocare(expandKind));
  }, [expandKind]);

  const onExpand = useCallback(() => {
    trackProEvent("pro_onboarding_step_completed", { step: "expand" });
    if (userId) void markProOnboardingCompleted(userId);
    if (expandKind === "addPet") {
      replace("/(logged-in)/add-pet" as Href);
      return;
    }
    if (expandKind === "records" && firstPetId) {
      replace(`/(logged-in)/pet/${firstPetId}/medical-records` as Href);
      return;
    }
    if (expandKind === "medications" && firstPetId) {
      replace(`/(logged-in)/pet/${firstPetId}/medications` as Href);
      return;
    }
    if (expandKind === "crittrAi") {
      replace("/(logged-in)/crittr-ai" as Href);
      return;
    }
    setStep("done");
  }, [expandKind, firstPetId, replace, userId]);

  const onExpandSkip = useCallback(() => {
    trackProEvent("pro_onboarding_skipped", { step: "expand" });
    setStep("done");
  }, []);

  if (!ready) {
    return (
      <View
        style={[
          proOnboardingStyles.screen,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={[proOnboardingStyles.screen, { paddingTop: insets.top + 16 }]}>
      <ScrollView
        style={proOnboardingStyles.scroll}
        contentContainerStyle={[
          proOnboardingStyles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProOnboardingView
          step={step}
          expandKind={expandKind}
          petName={firstPet?.name ?? null}
          onWelcomeContinue={onWelcomeContinue}
          welcomeBusy={planPending}
          onCocare={onCocare}
          onCocareSkip={onCocareSkip}
          onExpand={onExpand}
          onExpandSkip={onExpandSkip}
          onDone={goHome}
        />
      </ScrollView>
    </View>
  );
}
