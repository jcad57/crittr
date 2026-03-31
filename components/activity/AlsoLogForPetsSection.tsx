import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Pet } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

export type AlsoLogForPetsSectionProps = {
  /** Shown above the hint; default "Also log for". */
  title?: string;
  /** Explains what is shared vs per-pet for this activity type. */
  hint: string;
  extraPetIds: string[];
  /** Pets that can still be added (excluding active pet and already-added ids). */
  selectablePets: Pet[];
  petNameById: Map<string, string>;
  onAddPet: (petId: string) => void;
  onRemovePet: (petId: string) => void;
  fieldLabelStyle: StyleProp<TextStyle>;
};

/**
 * Shared “also log for” UI: label, hint, removable chips, dashed Add pet, picker modal.
 * Matches the exercise activity layout.
 */
export default function AlsoLogForPetsSection({
  title = "Also log for",
  hint,
  extraPetIds,
  selectablePets,
  petNameById,
  onAddPet,
  onRemovePet,
  fieldLabelStyle,
}: AlsoLogForPetsSectionProps) {
  const [pickPetOpen, setPickPetOpen] = useState(false);

  if (selectablePets.length === 0 && extraPetIds.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.batchSection}>
        <Text style={fieldLabelStyle}>{title}</Text>
        <Text style={styles.batchHint}>{hint}</Text>
        <View style={styles.chipRow}>
          {extraPetIds.map((id) => (
            <View key={id} style={styles.chip}>
              <Text style={styles.chipText} numberOfLines={1}>
                {petNameById.get(id) ?? "Pet"}
              </Text>
              <Pressable
                onPress={() => onRemovePet(id)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Remove pet"
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={Colors.gray500}
                />
              </Pressable>
            </View>
          ))}
          {selectablePets.length > 0 ? (
            <Pressable
              style={styles.addChip}
              onPress={() => setPickPetOpen(true)}
            >
              <MaterialCommunityIcons
                name="plus"
                size={18}
                color={Colors.orange}
              />
              <Text style={styles.addChipText}>Add pet</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Modal
        visible={pickPetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickPetOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickPetOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add pet</Text>
            <ScrollView
              style={styles.modalList}
              keyboardShouldPersistTaps="handled"
            >
              {selectablePets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.modalRow}
                  onPress={() => {
                    onAddPet(p.id);
                    setPickPetOpen(false);
                  }}
                >
                  <Text style={styles.modalRowText}>{p.name}</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setPickPetOpen(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  batchSection: {
    marginBottom: 12,
  },
  batchHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.gray100,
    maxWidth: "100%",
  },
  chipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    maxWidth: 160,
  },
  addChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderStyle: "dashed",
  },
  addChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: "70%",
  },
  modalTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 280,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  modalRowText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modalCancel: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCancelText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
