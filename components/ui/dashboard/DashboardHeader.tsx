import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type DashboardHeaderProps = {
  pets: Pet[];
  activePetId: string | null;
  onSwitchPet: (id: string) => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
};

export default function DashboardHeader({
  pets,
  activePetId,
  onSwitchPet,
  onNotificationsPress,
  onProfilePress,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handlePetPress = (pet: Pet) => {
    console.log(pet);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.avatarRow}
      >
        {pets.map((pet) => {
          const isActive = pet.id === activePetId;
          return (
            <TouchableOpacity
              key={pet.id}
              style={styles.avatarWrapper}
              activeOpacity={0.75}
              onPress={() => handlePetPress(pet)}
            >
              <View style={[styles.avatar, !isActive && styles.avatarInactive]}>
                <Text
                  style={[
                    styles.avatarText,
                    !isActive && styles.avatarTextInactive,
                  ]}
                >
                  {pet.name[0]}
                </Text>
              </View>
              <Text
                style={[
                  styles.avatarLabel,
                  isActive && styles.avatarLabelActive,
                ]}
                numberOfLines={1}
              >
                {pet.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 8,
  },
  avatarWrapper: {
    alignItems: "center",
    gap: 4,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.orange,
  },
  avatarInactive: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray300,
    opacity: 0.55,
  },
  avatarText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 20,
    color: Colors.orange,
  },
  avatarTextInactive: {
    color: Colors.gray400,
  },
  avatarLabel: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 11,
    color: Colors.textSecondary,
    maxWidth: AVATAR_SIZE + 8,
  },
  avatarLabelActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
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
