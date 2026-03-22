import { Colors } from "@/constants/colors";
import type { VetVisit } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type VetVisitCardProps = {
  visit: VetVisit;
  onPress?: () => void;
  onAddToCalendar?: () => void;
};

export default function VetVisitCard({
  visit,
  onPress,
  onAddToCalendar,
}: VetVisitCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: visit.accentColor }]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{visit.title}</Text>
        <Text style={[styles.date, { color: visit.accentColor }]}>
          {visit.date}
        </Text>
        <Text style={styles.time}>{visit.time}</Text>
      </View>
      <TouchableOpacity
        style={styles.calendarButton}
        onPress={onAddToCalendar}
        hitSlop={10}
      >
        <MaterialCommunityIcons
          name="calendar-plus"
          size={22}
          color={Colors.gray500}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderLeftWidth: 5,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  date: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
  },
  time: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  calendarButton: {
    padding: 8,
  },
});
