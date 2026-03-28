import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Pet } from "@/types/database";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  pets: Pet[];
  selectedPetId: string | null;
  onSelect: (petId: string | null) => void;
};

export default function HealthPetFilterChips({
  pets,
  selectedPetId,
  onSelect,
}: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <Pressable
          style={[styles.chip, selectedPetId === null && styles.chipActive]}
          onPress={() => onSelect(null)}
        >
          <Text
            style={[styles.chipText, selectedPetId === null && styles.chipTextActive]}
          >
            All pets
          </Text>
        </Pressable>
        {pets.map((p) => {
          const selected = selectedPetId === p.id;
          return (
            <Pressable
              key={p.id}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => onSelect(p.id)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -4,
  },
  scroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  chipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  chipTextActive: {
    color: Colors.white,
  },
});
