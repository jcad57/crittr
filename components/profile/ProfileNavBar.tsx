import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  onBack: () => void;
  onSettingsPress: () => void;
};

export default function ProfileNavBar({ title, onBack, onSettingsPress }: Props) {
  return (
    <View style={styles.navBar}>
      <Pressable
        style={styles.navButton}
        hitSlop={12}
        accessibilityLabel="Go back"
        onPress={onBack}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={24}
          color={Colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <Pressable
        style={styles.navButton}
        hitSlop={12}
        accessibilityLabel="Settings"
        onPress={onSettingsPress}
      >
        <MaterialCommunityIcons
          name="cog-outline"
          size={24}
          color={Colors.textPrimary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
