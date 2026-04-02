import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { markCoCareRemovalNotificationsRead } from "@/services/notifications";
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
  const refreshAuthSession = useAuthStore((s) => s.refreshAuthSession);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    void (async () => {
      try {
        await markCoCareRemovalNotificationsRead(session.user.id);
        await refreshAuthSession();
      } catch {
        // Non-blocking: session gate still works from Zustand transition state.
      }
    })();
  }, [session?.user.id, refreshAuthSession]);

  const onAddPet = () => {
    startAddPetFlow();
    router.replace("/(logged-in)/add-pet");
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name="account-remove"
          size={56}
          color={Colors.orange}
        />
      </View>
      <Text style={styles.title}>You no longer have access</Text>
      <Text style={styles.body}>
        You’ve been removed as a co-carer for the pet you were helping with.
        You won’t be able to view or log activities for that pet anymore.
      </Text>
      <Text style={styles.sub}>
        Add a pet you own to keep using Crittr, or close the app — when you
        come back, we’ll walk you through adding a pet like a new account.
      </Text>
      <View style={styles.spacer} />
      <OrangeButton onPress={onAddPet}>Add your own pet</OrangeButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    backgroundColor: Colors.background,
  },
  iconWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  sub: {
    fontSize: 14,
    lineHeight: 22,
    color: Colors.gray500,
    textAlign: "center",
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
});
