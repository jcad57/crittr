import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

type PetFoodProfileCardProps = {
  name: string;
  subline: string;
  isTreat: boolean;
};

export default function PetFoodProfileCard({
  name,
  subline,
  isTreat,
}: PetFoodProfileCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name="food-variant"
          size={22}
          color={Colors.orange}
        />
      </View>
      <View style={styles.mid}>
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subline}
        </Text>
      </View>
      <View
        style={[styles.badge, isTreat ? styles.badgeTreat : styles.badgeMeal]}
      >
        <Text
          style={[
            styles.badgeText,
            isTreat ? styles.badgeTextTreat : styles.badgeTextMeal,
          ]}
        >
          {isTreat ? "Treat" : "Meal"}
        </Text>
      </View>
    </View>
  );
}

const treatBg = "#FFF0DD";
const treatText = "#C2410C";
const mealBg = "#E6F4EA";
const mealText = "#1E854A";

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
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
  badgeTreat: {
    backgroundColor: treatBg,
  },
  badgeMeal: {
    backgroundColor: mealBg,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
  },
  badgeTextTreat: {
    color: treatText,
  },
  badgeTextMeal: {
    color: mealText,
  },
});
