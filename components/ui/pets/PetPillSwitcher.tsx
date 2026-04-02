import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { PetSummary } from "@/types/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const AVATAR_IN_PILL = 28;

function avatarUriFromPet(pet: PetSummary): string | null {
  const u = pet.imageUrl?.trim();
  return u || null;
}

type PetPillSwitcherProps = {
  pets: PetSummary[];
  activePetId: string | null;
  onSwitchPet: (id: string) => void;
};

/**
 * Horizontal pet chips (same interaction as the dashboard header pills).
 */
export default function PetPillSwitcher({
  pets,
  activePetId,
  onSwitchPet,
}: PetPillSwitcherProps) {
  if (pets.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.pillScroll}
      contentContainerStyle={styles.pillRow}
    >
      {pets.map((pet) => {
        const isActive = pet.id === activePetId;
        const uri = avatarUriFromPet(pet);
        return (
          <TouchableOpacity
            key={pet.id}
            style={[styles.petPill, isActive && styles.petPillActive]}
            activeOpacity={0.75}
            onPress={() => {
              if (pet.id !== activePetId) onSwitchPet(pet.id);
            }}
          >
            <View
              style={[styles.pillAvatar, isActive && styles.pillAvatarActive]}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.pillAvatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <MaterialCommunityIcons
                  name="paw"
                  size={16}
                  color={isActive ? Colors.white : Colors.gray500}
                />
              )}
            </View>
            <Text
              style={[
                styles.petPillLabel,
                isActive && styles.petPillLabelActive,
              ]}
              numberOfLines={1}
            >
              {pet.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pillScroll: {
    marginTop: 0,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 4,
  },
  petPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray300,
    maxWidth: 200,
  },
  petPillActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  pillAvatar: {
    width: AVATAR_IN_PILL,
    height: AVATAR_IN_PILL,
    borderRadius: AVATAR_IN_PILL / 2,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  pillAvatarActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  pillAvatarImage: {
    width: AVATAR_IN_PILL,
    height: AVATAR_IN_PILL,
  },
  petPillLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  petPillLabelActive: {
    color: Colors.white,
  },
});
