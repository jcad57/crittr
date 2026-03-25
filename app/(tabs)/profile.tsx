import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Profile() {
  const { signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/welcome");
  };

  return (
    <View>
      <Text>Profile</Text>
      <Pressable onPress={handleSignOut}>
        <Text>Sign Out</Text>
      </Pressable>
    </View>
  );
}
