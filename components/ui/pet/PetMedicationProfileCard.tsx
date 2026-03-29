import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

type PetMedicationProfileCardProps = {
  name: string;
  subline: string;
  status: "due_today" | "up_to_date";
  /** e.g. "2/2" for today's doses */
  progressLabel?: string;
  onPress?: () => void;
};

export default function PetMedicationProfileCard({
  name,
  subline,
  status,
  progressLabel,
  onPress,
}: PetMedicationProfileCardProps) {
  const isDue = status === "due_today";

  const inner = (
    <>
      <View style={styles.iconBox}>
        <Text style={styles.plus}>+</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subline}
        </Text>
      </View>
      <View
        style={[
          styles.badge,
          isDue ? styles.badgeDue : styles.badgeOk,
        ]}
      >
        <Text
          style={[styles.badgeText, isDue ? styles.badgeTextDue : styles.badgeTextOk]}
        >
          {progressLabel ?? (isDue ? "Due today" : "Up to date")}
        </Text>
      </View>
      {onPress ? (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={Colors.gray400}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${name}, edit medication`}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={styles.card}>{inner}</View>;
}

const coralBg = "#FFEBE6";
const coralText = "#C2410C";
const greenBg = "#E6F4EA";
const greenText = "#1E854A";

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: Colors.gray50,
    opacity: 0.96,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  plus: {
    fontFamily: Font.uiBold,
    fontSize: 20,
    color: Colors.orange,
    marginTop: -2,
  },
  mid: {
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
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: "36%",
  },
  badgeDue: {
    backgroundColor: coralBg,
  },
  badgeOk: {
    backgroundColor: greenBg,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
  },
  badgeTextDue: {
    color: coralText,
  },
  badgeTextOk: {
    color: greenText,
  },
});
