import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  onAddPress?: () => void;
};

export default function HealthSectionHeader({ title, onAddPress }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onAddPress ? (
        <Pressable onPress={onAddPress} hitSlop={8}>
          <Text style={styles.add}>Add</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
    marginTop: 0,
  },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  add: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
});
