import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PetCardProps = {
  /** `avatar_url` optional when a raw DB row is passed instead of mapped `imageUrl`. */
  pet: Pet & { avatar_url?: string | null };
};

const AVATAR_SIZE = 80;

function resolveAvatarUri(pet: PetCardProps["pet"]): string | null {
  const fromMapped = pet.imageUrl?.trim();
  if (fromMapped) return fromMapped;
  const fromDb =
    typeof pet.avatar_url === "string" ? pet.avatar_url.trim() : "";
  return fromDb || null;
}

export default function PetCard({ pet }: PetCardProps) {
  const { push } = useNavigationCooldown();
  const avatarUri = resolveAvatarUri(pet);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => push(`/(logged-in)/pet/${pet.id}`)}
    >
      <View style={styles.avatar}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <MaterialCommunityIcons name="paw" size={32} color={Colors.orange} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {pet.name}
      </Text>
      <Text style={styles.breed} numberOfLines={2}>
        {pet.breed}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
    maxWidth: 112,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.amberLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  name: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  breed: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
});
