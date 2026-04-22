import { supabase } from "@/lib/supabase";
import { ONBOARDING_STEPS } from "@/stores/onboardingStore";
import type { Profile } from "@/types/database";
import type { Session } from "@supabase/supabase-js";

const PROFILE_STEP = ONBOARDING_STEPS.indexOf("profile");
const PENDING_INVITES_STEP = ONBOARDING_STEPS.indexOf("pending-invites");
const PET_TYPE_STEP = ONBOARDING_STEPS.indexOf("pet-type");

/** Profile onboarding step: home address and phone required; bio is optional. */
export function isProfileStepComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    Boolean(profile.home_address?.trim()) &&
    Boolean(profile.phone_number?.trim())
  );
}

export type ResolvedOnboarding = {
  profile: Profile | null;
  needsOnboarding: boolean;
  hasPets: boolean;
  /** Step index in `ONBOARDING_STEPS` when `needsOnboarding` is true; otherwise `null`. */
  onboardingResumeStep: number | null;
  ownedPetCount: number;
  coCarePetCount: number;
  /** Unread "removed as co-carer" notifications (cold start after removal when app was closed). */
  unreadCoCareRemovalCount: number;
};

/**
 * One round-trip: profile row + pet counts (owned + co-cared) + pending invites (parallel).
 * Derives onboarding progress including co-care pets.
 */
export async function resolveSession(
  session: Session,
): Promise<ResolvedOnboarding> {
  const userId = session.user.id;

  const [
    profileRes,
    ownedCountRes,
    coCareCountRes,
    pendingInvitesRes,
    removalNotifRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId),
    supabase
      .from("pet_co_carers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("co_carer_invites")
      .select("*", { count: "exact", head: true })
      .eq("invited_user_id", userId)
      .eq("status", "pending"),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("type", "co_care_removed")
      .eq("read", false),
  ]);

  let profile = profileRes.data ?? null;
  const ownedCount = ownedCountRes.error ? 0 : ownedCountRes.count ?? 0;
  const coCareCount = coCareCountRes.error ? 0 : coCareCountRes.count ?? 0;
  const unreadCoCareRemovalCount = removalNotifRes.error
    ? 0
    : removalNotifRes.count ?? 0;
  const hasPets = ownedCount + coCareCount > 0;
  const pendingInviteCount = pendingInvitesRes.error
    ? 0
    : pendingInvitesRes.count ?? 0;

  if (
    profile?.onboarding_complete &&
    isProfileStepComplete(profile) &&
    hasPets
  ) {
    return {
      profile,
      needsOnboarding: false,
      hasPets,
      onboardingResumeStep: null,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  const profileComplete = isProfileStepComplete(profile);

  if (profileComplete && hasPets) {
    if (profile && !profile.onboarding_complete) {
      const { data: updated } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", userId)
        .select()
        .single();
      profile = updated ?? profile;
    }
    return {
      profile,
      needsOnboarding: false,
      hasPets,
      onboardingResumeStep: null,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  if (!profileComplete) {
    return {
      profile,
      needsOnboarding: true,
      hasPets,
      onboardingResumeStep: PROFILE_STEP,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  if (pendingInviteCount > 0) {
    return {
      profile,
      needsOnboarding: true,
      hasPets,
      onboardingResumeStep: PENDING_INVITES_STEP,
      ownedPetCount: ownedCount,
      coCarePetCount: coCareCount,
      unreadCoCareRemovalCount,
    };
  }

  return {
    profile,
    needsOnboarding: true,
    hasPets,
    onboardingResumeStep: PET_TYPE_STEP,
    ownedPetCount: ownedCount,
    coCarePetCount: coCareCount,
    unreadCoCareRemovalCount,
  };
}

export type ProfileOnboardingState = {
  needsOnboarding: boolean;
  onboardingResumeStep: number | null;
};

/**
 * Recompute onboarding flags from a profile row + cached pet ownership without
 * a full server resolve. Used by `setProfile` / `refreshProfileOnly` after
 * profile-only writes (address, phone, Pro entitlement, onboarding_complete)
 * where pet counts cannot have changed.
 */
export function deriveProfileOnboardingState(
  profile: Profile | null,
  hasPets: boolean,
): ProfileOnboardingState {
  if (profile?.onboarding_complete) {
    return { needsOnboarding: false, onboardingResumeStep: null };
  }
  const profileComplete = isProfileStepComplete(profile);
  const done = profileComplete && hasPets;
  return {
    needsOnboarding: !done,
    onboardingResumeStep: done
      ? null
      : !profileComplete
        ? PROFILE_STEP
        : PET_TYPE_STEP,
  };
}

/**
 * Co-carer-only users who lose their last co-care link need a dedicated screen
 * before generic onboarding (add a pet they own).
 */
export function nextRequiresCoCareRemovedScreen(
  prev: {
    hasPets: boolean;
    ownedPetCount: number;
    coCarePetCount: number;
    requiresCoCareRemovedScreen: boolean;
  },
  resolved: ResolvedOnboarding,
): boolean {
  const profileComplete = isProfileStepComplete(resolved.profile);

  const lostAllCoCareOnly =
    prev.hasPets &&
    !resolved.hasPets &&
    resolved.ownedPetCount === 0 &&
    prev.coCarePetCount > 0 &&
    resolved.coCarePetCount === 0;

  const coldStartFromRemovalNotification =
    !resolved.hasPets &&
    resolved.ownedPetCount === 0 &&
    resolved.coCarePetCount === 0 &&
    profileComplete &&
    resolved.unreadCoCareRemovalCount > 0;

  if (lostAllCoCareOnly || coldStartFromRemovalNotification) return true;
  if (resolved.hasPets) return false;
  return prev.requiresCoCareRemovedScreen;
}
