import { Colors } from "@/constants/colors";
import type { Pet } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import SectionHeader from "./SectionHeader";
import PetCard from "./PetCard";

type PetManagementProps = {
  pets: Pet[];
  onMorePress?: () => void;
  onAddPet?: () => void;
};

export default function PetManagement({
  pets,
  onMorePress,
  onAddPet,
}: PetManagementProps) {
  return (
    <View style={styles.container}>
      <SectionHeader title="Pets" onMorePress={onMorePress} />
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

const ADD_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 24,
  },
  addCard: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gray300,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
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
