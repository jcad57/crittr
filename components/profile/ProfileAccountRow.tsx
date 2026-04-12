import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

type Props = {
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconImage?: ImageSourcePropType;
  label: string;
  value: string;
};

export default function ProfileAccountRow({
  icon,
  iconImage,
  label,
  value,
}: Props) {
  return (
    <View style={styles.cardRow}>
      <View style={[styles.iconTile, styles.iconTileAccount]}>
        {iconImage != null ? (
          <Image
            source={iconImage}
            style={styles.rowIconImage}
            contentFit="contain"
          />
        ) : (
          <MaterialCommunityIcons
            name={icon ?? "account-outline"}
            size={26}
            color={Colors.textPrimary}
          />
        )}
      </View>
      <View style={styles.accountRowMid}>
        <Text style={styles.accountLabel}>{label}</Text>
        <Text style={styles.accountValue} numberOfLines={2}>
          {value.trim() || "—"}
        </Text>
      </View>
    </View>
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
  iconTileAccount: {
    backgroundColor: Colors.orangeLight,
  },
  accountRowMid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minWidth: 0,
  },
  accountLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    flexShrink: 0,
  },
  accountValue: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "right",
  },
});
