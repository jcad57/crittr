import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import SocialCircleButton from "./SocialCircleButton";

type Props = {
  onGooglePress: () => void;
  /**
   * When true, swaps the Google glyph for a spinner so the button reflects
   * the in-flight OAuth → code-exchange → profile-hydration cycle. Caller is
   * expected to keep this `true` for the duration of `signInWithGoogle()`.
   */
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
        {googleLoading ? (
          <ActivityIndicator
            size="small"
            color={Colors.gray500}
            accessibilityLabel="Signing in with Google"
          />
        ) : (
          <MaterialCommunityIcons
            name="google"
            size={22}
            color={Colors.gray500}
          />
        )}
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
