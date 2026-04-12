import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ImageSourcePropType } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type RecordsNavItem = {
  id: string;
  title: string;
  subtitle: string;
  /** Vector icon — omit when `iconImage` is set. */
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** PNG asset (e.g. pet profile records); matches food row icon sizing. */
  iconImage?: ImageSourcePropType;
  iconBg: string;
  iconColor?: string;
  onPress?: () => void;
  /** Default true. Set false for in-place actions (no navigation). */
  showChevron?: boolean;
  /** Light red row styling for destructive actions. */
  variant?: "default" | "destructive";
};

type RecordsNavCardProps = {
  items: RecordsNavItem[];
};

export default function RecordsNavCard({ items }: RecordsNavCardProps) {
  return (
    <View style={styles.wrap}>
      {items.map((item, index) => {
        const destructive = item.variant === "destructive";
        const showChevron = item.showChevron !== false;
        return (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.row,
              destructive && styles.rowDestructive,
              index < items.length - 1 && styles.rowBorder,
              destructive && index < items.length - 1 && styles.rowBorderDestructive,
            ]}
            onPress={item.onPress}
            activeOpacity={0.65}
            disabled={!item.onPress}
          >
            <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
              {item.iconImage != null ? (
                <Image
                  source={item.iconImage}
                  style={styles.iconImage}
                  contentFit="contain"
                />
              ) : (
                <MaterialCommunityIcons
                  name={item.icon!}
                  size={24}
                  color={item.iconColor ?? Colors.gray400}
                />
              )}
            </View>
            <View style={styles.textCol}>
              <Text
                style={[styles.title, destructive && styles.titleDestructive]}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.sub, destructive && styles.subDestructive]}
                numberOfLines={2}
              >
                {item.subtitle}
              </Text>
            </View>
            {showChevron ? (
              <MaterialCommunityIcons
                name="chevron-right"
                size={22}
                color={destructive ? Colors.error : Colors.gray400}
              />
            ) : (
              <View style={styles.chevronSpacer} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  rowDestructive: {
    backgroundColor: Colors.errorLight,
  },
  rowBorderDestructive: {
    borderBottomColor: "rgba(239, 68, 68, 0.2)",
  },
  titleDestructive: {
    color: Colors.error,
  },
  subDestructive: {
    color: Colors.gray700,
  },
  chevronSpacer: {
    width: 22,
  },
  /** Matches `PetFoodProfileCard` icon column (40×40, 26×26 artwork). */
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconImage: {
    width: 26,
    height: 26,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
  },
});
