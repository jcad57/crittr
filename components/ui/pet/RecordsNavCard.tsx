import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type RecordsNavItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconBg: string;
  iconColor: string;
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
              <MaterialCommunityIcons
                name={item.icon}
                size={22}
                color={item.iconColor}
              />
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
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
