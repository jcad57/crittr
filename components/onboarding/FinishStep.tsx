import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { healthSnapshotKey, petsQueryKey } from "@/hooks/queries";
import { queryClient } from "@/lib/queryClient";
import {
  PetCreatedCoCareInviteFailedError,
  createPet,
  fetchUserPets,
  repairActivePetSelection,
} from "@/services/pets";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useShallow } from "zustand/react/shallow";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { UPGRADE_FROM_ONBOARDING_HREF } from "@/utils/proUpgradePaths";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HIGH_FIVE = require("@/assets/images/high-five.png");

export default function FinishStep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { pets, editPetAtIndex, reset, petFlowMode, profileData } =
    useOnboardingStore(
    useShallow((s) => ({
      pets: s.pets,
      editPetAtIndex: s.editPetAtIndex,
      reset: s.reset,
      petFlowMode: s.petFlowMode,
      profileData: s.profileData,
    })),
  );
  const session = useAuthStore((s) => s.session);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const refreshAuthSession = useAuthStore((s) => s.refreshAuthSession);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (!session) return;
    setIsSubmitting(true);
    /**
     * Tracks any *non-fatal* warning we want to surface to the user without
     * stranding them on the FinishStep. The pet itself is in Supabase before
     * we ever mention these.
     */
    let postCreateWarning: string | null = null;

    try {
      const existingPets = await fetchUserPets(session.user.id);
      const existingByRequestId = new Map(
        existingPets
          .filter((p) => p.client_request_id != null)
          .map((p) => [p.client_request_id as string, p]),
      );

      const createdIds: string[] = [];

      for (let i = 0; i < pets.length; i++) {
        const form = pets[i];
        /**
         * If a previous attempt already created this exact pet form (same
         * idempotency key), reuse it. Foods / meds / vaccinations from the
         * prior attempt are preserved; we simply skip the create call.
         */
        if (
          form.clientRequestId &&
          existingByRequestId.has(form.clientRequestId)
        ) {
          createdIds.push(
            existingByRequestId.get(form.clientRequestId)!.id,
          );
          continue;
        }

        const isFirstInAccount =
          existingPets.length === 0 &&
          createdIds.length === 0 &&
          i === 0;

        try {
          const pet = await createPet(session.user.id, form, isFirstInAccount, {
            clientRequestId: form.clientRequestId || null,
          });
          createdIds.push(pet.id);
        } catch (createErr) {
          if (createErr instanceof PetCreatedCoCareInviteFailedError) {
            /**
             * The pet itself was created — only the co-carer invite failed
             * (typically because the user isn't Pro yet during onboarding).
             * Continue with the rest of the flow and warn after we land on
             * the next screen.
             */
            createdIds.push(createErr.pet.id);
            postCreateWarning =
              "We couldn't send the co-carer invite during sign-up. You can re-send it from the pet's profile after upgrading to Pro.";
            continue;
          }
          throw createErr;
        }
      }

      if (
        petFlowMode === "onboarding" &&
        pets[0]?.petType === "cat" &&
        (profileData.litterCleaningPeriod === "day" ||
          profileData.litterCleaningPeriod === "week" ||
          profileData.litterCleaningPeriod === "month")
      ) {
        const raw = profileData.litterCleaningsPerPeriod.trim();
        const n = raw !== "" ? parseInt(raw, 10) : NaN;
        if (Number.isFinite(n) && n >= 1) {
          await updateProfile(session.user.id, {
            litter_cleaning_period: profileData.litterCleaningPeriod,
            litter_cleanings_per_period: n,
          });
        }
      }

      /**
       * Ensure the dashboard has exactly one living, non-archived pet
       * flagged active so we never land on the "limbo zero-pet" view even
       * if a previous downgrade-cleanup or memorialisation left state
       * inconsistent. Server-side, idempotent.
       */
      await repairActivePetSelection(session.user.id);

      /**
       * Flip `onboarding_complete` before navigating + refreshing the auth
       * session so the (auth) layout doesn't bounce the user back to
       * onboarding mid-transition. We do this BEFORE `reset()` so any
       * exception leaves the onboarding store intact and the user can
       * retry without losing their pet data.
       */
      if (petFlowMode === "onboarding") {
        try {
          await completeOnboarding();
        } catch (completeErr) {
          if (__DEV__) {
            console.warn("[FinishStep] completeOnboarding failed", completeErr);
          }
          /**
           * `resolveSession` self-heals `onboarding_complete` on the next
           * load (profile complete + has pets → flips to true), so this is
           * non-fatal. We continue with refreshAuthSession to recompute
           * `needsOnboarding` from the current server state.
           */
        }
      }

      /**
       * Always refresh the auth session: it updates `hasPets`,
       * `ownedPetCount`, and `needsOnboarding` from a fresh server count.
       * Without this the (auth) layout can redirect a logged-in user back to
       * onboarding right after they finished it.
       */
      try {
        await refreshAuthSession();
      } catch (refreshErr) {
        if (__DEV__) {
          console.warn("[FinishStep] refreshAuthSession failed", refreshErr);
        }
        /**
         * Surface but don't block — `hasPets` is also recomputed every time
         * the user re-opens the app. We still want to leave onboarding.
         */
      }

      await queryClient.invalidateQueries({
        queryKey: petsQueryKey(session.user.id),
      });
      await queryClient.invalidateQueries({
        queryKey: healthSnapshotKey(session.user.id),
      });

      /**
       * Only clear the onboarding store after persistence + auth sync
       * succeeded. If anything above threw we'd have skipped this and the
       * user could retry without re-typing their pet.
       */
      reset();

      if (postCreateWarning) {
        Alert.alert("Heads up", postCreateWarning);
      }

      if (petFlowMode === "add-pet" && createdIds.length > 0) {
        const lastId = createdIds[createdIds.length - 1];
        router.replace(`/(logged-in)/pet/${lastId}` as Href);
      } else if (petFlowMode === "onboarding") {
        router.replace(UPGRADE_FROM_ONBOARDING_HREF as Href);
      } else {
        router.replace("/(logged-in)/dashboard" as Href);
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : petFlowMode === "add-pet"
            ? "Failed to add your pet."
            : "Failed to complete onboarding.";
      Alert.alert("Error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.outer}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollInner,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroImageWrap}>
          <Image
            source={HIGH_FIVE}
            style={styles.heroImage}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>

        <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 8 }]}>
          You&apos;re all set!
        </Text>
        <Text
          style={[authOnboardingStyles.screenSubtitle, { marginBottom: 24 }]}
        >
          {pets.length === 1
            ? "Here's the pet you've added:"
            : `Here are the ${pets.length} pets you've added:`}
        </Text>

        <View style={styles.chipContainer}>
          {pets.map((p, i) => (
            <View key={p.clientRequestId || i} style={styles.chip}>
              <View style={styles.chipLeft}>
                <View style={styles.chipTitleRow}>
                  <MaterialCommunityIcons
                    name="paw"
                    size={16}
                    color={Colors.orange}
                  />
                  <Text style={styles.chipName}>
                    {p.name || `Pet ${i + 1}`}
                  </Text>
                </View>
                {p.breed ? (
                  <Text style={styles.chipBreed}>{p.breed}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => editPetAtIndex(i)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.editHit,
                  pressed && styles.editHitPressed,
                ]}
              >
                <Text style={styles.editLabel}>Edit</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() => router.push(UPGRADE_FROM_ONBOARDING_HREF as Href)}
        >
          <MaterialCommunityIcons name="plus" size={20} color={Colors.orange} />
          <Text style={styles.addButtonText}>Add Another Pet</Text>
        </Pressable>

        <OrangeButton
          onPress={handleFinish}
          loading={isSubmitting}
          style={styles.finishCta}
        >
          Finish
        </OrangeButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: "100%",
  },
  scroll: {
    flex: 1,
  },
  scrollInner: {
    flexGrow: 1,
    paddingTop: 40,
  },
  heroImageWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  heroImage: {
    width: "100%",
    maxWidth: 160,
    height: 120,
  },
  chipContainer: {
    gap: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 14,
    backgroundColor: Colors.white,
  },
  chipLeft: {
    flex: 1,
    minWidth: 0,
  },
  chipTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chipName: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  chipBreed: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    marginLeft: 26,
  },
  editHit: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  editHitPressed: {
    opacity: 0.65,
  },
  editLabel: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: Colors.orange,
    borderRadius: 999,
    height: 50,
    marginTop: 20,
  },
  addButtonText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  finishCta: {
    marginTop: 28,
  },
});
