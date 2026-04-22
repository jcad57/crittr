import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  onBack: () => void;
  /** Optional right-side slot (e.g. PetNavAvatar). Defaults to a 28-wide spacer to balance the back chevron. */
  right?: ReactNode;
};

export default function ActivityWizardChrome({ title, onBack, right }: Props) {
  return (
    <View style={styles.nav}>
      <Pressable onPress={onBack} hitSlop={8}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          color={Colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={styles.navSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
});
