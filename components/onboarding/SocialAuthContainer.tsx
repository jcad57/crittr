import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import SocialCircleButton from "./SocialCircleButton";

export default function SocialAuthContainer() {
  return (
    <>
      <View style={styles.socialRow}>
        <SocialCircleButton>
          <MaterialCommunityIcons
            name="google"
            size={22}
            color={Colors.gray500}
          />
        </SocialCircleButton>
        <SocialCircleButton>
          <MaterialCommunityIcons
            name="apple"
            size={22}
            color={Colors.gray500}
          />
        </SocialCircleButton>
        <SocialCircleButton>
          <MaterialCommunityIcons
            name="facebook"
            size={22}
            color={Colors.gray500}
          />
        </SocialCircleButton>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
});
