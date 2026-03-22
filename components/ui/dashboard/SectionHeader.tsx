import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  onMorePress?: () => void;
};

export default function SectionHeader({
  title,
  subtitle,
  onMorePress,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {onMorePress && (
        <TouchableOpacity onPress={onMorePress} hitSlop={12}>
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={24}
            color={Colors.gray500}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  left: {
    flex: 1,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
