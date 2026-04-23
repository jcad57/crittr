import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import SocialCircleButton from "./SocialCircleButton";

type Props = {
  onGooglePress: () => void;
  /** Facebook / Apple — re-enable `disabled` and `onPress` when you add those providers. */
  googleLoading?: boolean;
  googleDisabled?: boolean;
};

/**
 * Google OAuth only for now. Placeholders for Apple/Facebook are removed so
 * the row isn’t a dead control.
 */
export default function SocialAuthContainer({
  onGooglePress,
  googleLoading = false,
  googleDisabled = false,
}: Props) {
  return (
    <View style={styles.socialRow}>
      <SocialCircleButton
        onPress={onGooglePress}
        disabled={googleDisabled || googleLoading}
      >
        <MaterialCommunityIcons
          name="google"
          size={22}
          color={Colors.gray500}
        />
      </SocialCircleButton>
    </View>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
});
