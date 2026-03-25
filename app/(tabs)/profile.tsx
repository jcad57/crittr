import ScreenWrapper from "@/components/ui/ScreenWrapper";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

export default function Profile() {
  const { signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/welcome");
  };

  return (
    <ScreenWrapper>
      <Text>Profile</Text>
      <Pressable onPress={handleSignOut}>
        <Text>Sign Out</Text>
      </Pressable>
    </ScreenWrapper>
  );
}
