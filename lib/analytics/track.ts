/**
 * Typed product events. These are the conversions and activation metrics
 * Crittr should mark in Firebase / Google Ads:
 *
 * Google Ads (import from GA4):
 *   first_open          — automatic; App install
 *   sign_up             — account created
 *   tutorial_complete   — finished onboarding with a pet (activated)
 *   purchase            — Crittr Pro paid (or trial converted at store)
 *
 * Funnel / retention (Firebase Explorations, not necessarily Ads conversions):
 *   login, tutorial_begin, pet_created, activity_logged, paywall / checkout,
 *   health records, co-care, CrittrAI.
 */

import { isCrittrProFromProfile } from "@/lib/crittrPro";
import type { Profile } from "@/types/database";
import {
  logAnalyticsEvent,
  logBeginCheckout,
  logLogin,
  logPurchase,
  logScreenView as logNativeScreenView,
  logSignUp,
  logTutorialBegin,
  logTutorialComplete,
  logViewItem,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
} from "./firebase";
import { petCountBucket, screenNameFromPath } from "./params";

export type AuthMethod = "email" | "google" | "apple";

export function trackSignUp(method: AuthMethod): void {
  logSignUp(method);
}

export function trackLogin(method: AuthMethod): void {
  logLogin(method);
}

let tutorialBeginLogged = false;

export function trackTutorialBegin(): void {
  if (tutorialBeginLogged) return;
  tutorialBeginLogged = true;
  logTutorialBegin();
}

export function trackTutorialComplete(): void {
  logTutorialComplete();
}

export function trackScreenView(pathname: string): void {
  logNativeScreenView(screenNameFromPath(pathname));
}

export function trackPetCreated(params: {
  petType: string | null;
  isFirstPet: boolean;
}): void {
  logAnalyticsEvent("pet_created", {
    pet_type: params.petType || "unknown",
    is_first_pet: params.isFirstPet,
  });
}

export function trackActivityLogged(activityType: string): void {
  logAnalyticsEvent("activity_logged", { activity_type: activityType });
}

export function trackMedicationAdded(): void {
  logAnalyticsEvent("medication_added");
}

export function trackVaccinationAdded(): void {
  logAnalyticsEvent("vaccination_added");
}

export function trackMedicalRecordAdded(fileCount: number): void {
  logAnalyticsEvent("medical_record_added", { file_count: fileCount });
}

export function trackVetVisitAdded(): void {
  logAnalyticsEvent("vet_visit_added");
}

export function trackCoCareInviteSent(): void {
  logAnalyticsEvent("co_care_invite_sent");
}

export function trackCoCareInviteAccepted(): void {
  logAnalyticsEvent("co_care_invite_accepted");
}

export function trackCrittrAiMessageSent(isNewConversation: boolean): void {
  logAnalyticsEvent("crittr_ai_message_sent", {
    is_new_conversation: isNewConversation,
  });
}

export function trackPaywallViewed(params: {
  billing: string;
  source?: string;
}): void {
  logViewItem({
    itemId: "crittr_pro",
    itemName: "Crittr Pro",
    itemCategory: params.billing,
  });
  logAnalyticsEvent("paywall_viewed", {
    billing: params.billing,
    source: params.source,
  });
}

export function trackBeginCheckout(params: {
  value: number;
  currency: string;
  itemId: string;
  billing: string;
}): void {
  logBeginCheckout({
    value: params.value,
    currency: params.currency || "USD",
    itemId: params.itemId,
    itemName: "Crittr Pro",
    itemCategory: params.billing,
  });
}

export function trackPurchase(params: {
  value: number;
  currency: string;
  itemId: string;
  billing: string;
  transactionId?: string;
}): void {
  logPurchase({
    value: params.value,
    currency: params.currency || "USD",
    itemId: params.itemId,
    itemName: "Crittr Pro",
    itemCategory: params.billing,
    transactionId: params.transactionId,
  });
}

export function trackCheckoutOutcome(params: {
  outcome: "cancelled" | "pending" | "already_owned" | "failed";
  billing?: string;
  itemId?: string;
}): void {
  logAnalyticsEvent("checkout_outcome", {
    outcome: params.outcome,
    billing: params.billing,
    item_id: params.itemId,
  });
}

export function trackRestorePurchases(unlockedPro: boolean): void {
  logAnalyticsEvent("restore_purchases", { unlocked_pro: unlockedPro });
}

export function trackAppRatingPromptShown(): void {
  logAnalyticsEvent("app_rating_prompt_shown");
}

export function trackAppRatingPromptSnoozed(): void {
  logAnalyticsEvent("app_rating_prompt_snoozed");
}

export function trackAppRatingPromptConfirmed(starCount: number): void {
  logAnalyticsEvent("app_rating_prompt_confirmed", { star_count: starCount });
}

export function identifyAnalyticsUser(input: {
  userId: string | null;
  profile: Pick<Profile, "crittr_pro_active" | "crittr_pro_until"> | null;
  ownedPetCount: number;
  onboardingComplete: boolean;
}): void {
  setAnalyticsUserId(input.userId);
  if (!input.userId) {
    setAnalyticsUserProperties({
      account_tier: null,
      pet_count_bucket: null,
      onboarding_complete: null,
    });
    return;
  }
  setAnalyticsUserProperties({
    account_tier: isCrittrProFromProfile(input.profile) ? "pro" : "free",
    pet_count_bucket: petCountBucket(input.ownedPetCount),
    onboarding_complete: input.onboardingComplete ? "yes" : "no",
  });
}

export function clearAnalyticsUser(): void {
  identifyAnalyticsUser({
    userId: null,
    profile: null,
    ownedPetCount: 0,
    onboardingComplete: false,
  });
}
