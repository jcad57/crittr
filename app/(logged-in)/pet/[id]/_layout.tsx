import { useThemeColors } from "@/theme/colors";
import { usePetAccessGuard } from "@/hooks/usePetAccessGuard";
import { Stack, useLocalSearchParams } from "expo-router";

export default function PetIdLayout() {
  const Colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  usePetAccessGuard(id);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.splashBackground },
      }}
    />
  );
}
