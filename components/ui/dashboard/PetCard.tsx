import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PetCardProps = {
  pet: Pet;
};

const AVATAR_SIZE = 80;

export default function PetCard({ pet }: PetCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/(logged-in)/pet/${pet.id}`)}
    >
      <View style={styles.avatar}>
        {pet.imageUrl ? null : (
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
