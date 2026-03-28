import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  onMarkDone: () => void;
};

export default function HealthActionBanner({
  title,
  subtitle,
  onMarkDone,
}: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="alert" size={26} color={Colors.white} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Pressable onPress={onMarkDone} hitSlop={8}>
        <Text style={styles.markDone}>Mark done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.profileHeroDark,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.white,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 18,
  },
  markDone: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
});
