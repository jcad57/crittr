import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import PetCard from "./PetCard";
import SectionLabel from "./SectionLabel";

type PetManagementProps = {
  pets: Pet[];
  onAddPet?: () => void;
};

export default function PetManagement({ pets, onAddPet }: PetManagementProps) {
  return (
    <View style={styles.container}>
      <SectionLabel>My pets</SectionLabel>
      <View style={styles.row}>
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} />
        ))}

        <TouchableOpacity
          style={styles.addCard}
          onPress={onAddPet}
          activeOpacity={0.6}
        >
          <View style={styles.addCircle}>
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={Colors.gray400}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const AVATAR_SIZE = 80;
const ADD_SIZE = 56;
const ADD_TOP_OFFSET = (AVATAR_SIZE - ADD_SIZE) / 2;

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  addCard: {
    alignItems: "center",
    marginTop: ADD_TOP_OFFSET,
  },
  addCircle: {
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: ADD_SIZE / 2,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
});
