import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const avatarUri = resolveAvatarUri(pet);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/(logged-in)/pet/${pet.id}`)}
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
      <Text style={styles.name}>{pet.name}</Text>
      <Text style={styles.breed}>{pet.breed}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  },
  breed: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
