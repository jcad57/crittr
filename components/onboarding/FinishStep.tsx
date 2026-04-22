import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { healthSnapshotKey, petsQueryKey } from "@/hooks/queries";
import { queryClient } from "@/lib/queryClient";
import { createPet, fetchUserPets } from "@/services/pets";
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
  const { pets, editPetAtIndex, reset, petFlowMode } = useOnboardingStore(
    useShallow((s) => ({
      pets: s.pets,
      editPetAtIndex: s.editPetAtIndex,
      reset: s.reset,
      petFlowMode: s.petFlowMode,
    })),
  );
  const session = useAuthStore((s) => s.session);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const refreshAuthSession = useAuthStore((s) => s.refreshAuthSession);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFinish = async () => {
    if (!session) return;
    setIsSubmitting(true);
    try {
      const existingPets = await fetchUserPets(session.user.id);
      const createdIds: string[] = [];

      for (let i = 0; i < pets.length; i++) {
        const isFirstInAccount = existingPets.length === 0 && i === 0;
        const pet = await createPet(session.user.id, pets[i], isFirstInAccount);
        createdIds.push(pet.id);
      }

      if (petFlowMode === "onboarding") {
        await completeOnboarding();
      } else {
        await refreshAuthSession();
      }

      await queryClient.invalidateQueries({
        queryKey: petsQueryKey(session.user.id),
      });
      await queryClient.invalidateQueries({
        queryKey: healthSnapshotKey(session.user.id),
      });
      reset();

      if (petFlowMode === "add-pet" && createdIds.length > 0) {
        const lastId = createdIds[createdIds.length - 1];
        router.replace(`/(logged-in)/pet/${lastId}`);
      } else if (petFlowMode === "onboarding") {
        router.push(UPGRADE_FROM_ONBOARDING_HREF as Href);
      } else {
        router.replace("/(logged-in)/dashboard");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message ??
          (petFlowMode === "add-pet"
            ? "Failed to add your pet."
            : "Failed to complete onboarding."),
      );
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
            <View key={i} style={styles.chip}>
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
