import OnboardingCard from "@/components/onboarding/OnboardingCard";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useDismissCoCareRemovedMutation } from "@/hooks/queries";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  BackHandler,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function CoCareRemovedScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const startAddPetFlow = useOnboardingStore((s) => s.startAddPetFlow);
  const dismissMut = useDismissCoCareRemovedMutation();

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  /** Non-blocking: session gate still works from Zustand transition state if this fails. */
  useEffect(() => {
    if (!session?.user.id) return;
    dismissMut.mutate(undefined, {
      onError: () => {},
    });
    // Trigger once per user id — the mutation object itself is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  const onAddPet = () => {
    startAddPetFlow();
    router.replace("/(logged-in)/add-pet");
  };

  return (
    <OnboardingCard>
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name="account-remove"
            size={56}
            color={Colors.orange}
          />
        </View>
        <Text style={[authOnboardingStyles.screenTitle, styles.titleSpacing]}>
          You no longer have access
        </Text>
        <Text style={[authOnboardingStyles.body, styles.bodySpacing]}>
          You&apos;ve been removed as a co-carer for the pet you were helping
          with. You won&apos;t be able to view or log activities for that pet
          anymore.
        </Text>
        <Text style={styles.sub}>
          Add a pet you own to keep using Crittr, or close the app — when you
          come back, we&apos;ll walk you through adding a pet like a new
          account.
        </Text>
        <View style={styles.spacer} />
        <OrangeButton onPress={onAddPet}>Add your own pet</OrangeButton>
      </View>
    </OnboardingCard>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    minHeight: 360,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  titleSpacing: {
    marginBottom: 14,
  },
  bodySpacing: {
    textAlign: "center",
    marginBottom: 12,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: "center",
    opacity: 0.95,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
});
