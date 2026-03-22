import { Colors } from "@/constants/colors";
import type { AlertData } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type AlertBannerProps = {
  alert: AlertData;
  onPress?: () => void;
};

export default function AlertBanner({ alert, onPress }: AlertBannerProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        <MaterialCommunityIcons name="paw" size={16} color={Colors.orange} />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        <Text style={styles.petName}>{alert.petName}</Text> {alert.message}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={Colors.gray400}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.orangeLight,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.orange,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  petName: {
    fontFamily: "InstrumentSans-Bold",
  },
});
