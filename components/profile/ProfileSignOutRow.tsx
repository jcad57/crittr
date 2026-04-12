import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { PROFILE_ICONS } from "./profileIcons";

type Props = {
  onSignOut: () => void;
};

export default function ProfileSignOutRow({ onSignOut }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.signOutCard,
        pressed && { opacity: 0.65 },
      ]}
      onPress={onSignOut}
      accessibilityRole="button"
      accessibilityLabel="Sign out"
    >
      <View style={styles.signOutIconBox}>
        <Image
          source={PROFILE_ICONS.signOut}
          style={styles.rowIconImage}
          contentFit="contain"
        />
      </View>
      <Text style={styles.signOutText}>Sign out</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.gray400}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  signOutCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.coralLight,
    gap: 12,
  },
  signOutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.signOutCoralIconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconImage: {
    width: 26,
    height: 26,
  },
  signOutText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.signOutCoral,
  },
});
