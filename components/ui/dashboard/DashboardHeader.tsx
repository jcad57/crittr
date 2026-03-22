import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type DashboardHeaderProps = {
  pet: Pet;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  onSwitchPetPress?: () => void;
};

export default function DashboardHeader({
  pet,
  onNotificationsPress,
  onProfilePress,
  onSwitchPetPress,
}: DashboardHeaderProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={onSwitchPetPress}
        activeOpacity={0.7}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{pet.name[0]}</Text>
        </View>
        <View style={styles.addBadge}>
          <MaterialCommunityIcons name="plus" size={12} color={Colors.white} />
        </View>
      </TouchableOpacity>

      <View style={styles.rightIcons}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onNotificationsPress}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={24}
            color={Colors.gray800}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onProfilePress}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="account-circle-outline"
            size={26}
            color={Colors.gray800}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 46;
const BADGE_SIZE = 20;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 20,
    color: Colors.orange,
  },
  addBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
});
