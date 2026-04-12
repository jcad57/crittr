import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

type Props = {
  iconImage: ImageSourcePropType;
  title: string;
  iconBg: string;
  onPress?: () => void;
};

export default function ProfileSupportRow({
  iconImage,
  title,
  iconBg,
  onPress,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardRow,
        pressed && styles.cardRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconTile, { backgroundColor: iconBg }]}>
        <Image
          source={iconImage}
          style={styles.rowIconImage}
          contentFit="contain"
        />
      </View>
      <Text style={styles.supportTitle}>{title}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.gray400}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  cardRowPressed: {
    backgroundColor: Colors.gray50,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconImage: {
    width: 26,
    height: 26,
  },
  supportTitle: {
    flex: 1,
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
