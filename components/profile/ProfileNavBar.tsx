import ScreenHeader from "@/components/ui/ScreenHeader";
import { Colors } from "@/theme/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

type Props = {
  title: string;
  onBack: () => void;
  onSettingsPress: () => void;
};

export default function ProfileNavBar({ title, onBack, onSettingsPress }: Props) {
  return (
    <ScreenHeader
      title={title}
      onBack={onBack}
      right={
        <Pressable
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={onSettingsPress}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={Colors.textPrimary}
          />
        </Pressable>
      }
    />
  );
}
