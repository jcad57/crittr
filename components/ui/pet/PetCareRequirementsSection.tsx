import { Colors } from "@/constants/colors";
import type { FeedingFoodItem, FeedingSchedule } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PetCareRequirementsSectionProps = {
  feeding: FeedingSchedule;
  exercisesPerDay: number | null;
  petType: string | null;
};

/** Pet types that collect “exercises per day” during onboarding. */
const EXERCISE_ONBOARDING_TYPES = new Set(["dog", "other"]);

function cloneFeeding(f: FeedingSchedule): FeedingSchedule {
  return {
    items: f.items.map((i) => ({ ...i })),
    notes: f.notes,
  };
}

export default function PetCareRequirementsSection({
  feeding,
  exercisesPerDay,
  petType,
}: PetCareRequirementsSectionProps) {
  const showExerciseCount =
    petType == null || EXERCISE_ONBOARDING_TYPES.has(petType);

  const [editing, setEditing] = useState(false);
  const [savedFeeding, setSavedFeeding] = useState(feeding);
  const [draftFeeding, setDraftFeeding] = useState(feeding);
  const [savedEx, setSavedEx] = useState(exercisesPerDay);
  const [draftEx, setDraftEx] = useState(() =>
    exercisesPerDay != null ? String(exercisesPerDay) : "",
  );

  useEffect(() => {
    setSavedFeeding(feeding);
    setDraftFeeding(feeding);
    setSavedEx(exercisesPerDay);
    setDraftEx(exercisesPerDay != null ? String(exercisesPerDay) : "");
  }, [feeding, exercisesPerDay]);

  const save = useCallback(() => {
    setSavedFeeding(cloneFeeding(draftFeeding));
    const trimmed = draftEx.trim();
    if (trimmed === "") {
      setSavedEx(null);
    } else {
      const n = parseInt(trimmed, 10);
      setSavedEx(Number.isFinite(n) ? n : null);
    }
    setEditing(false);
  }, [draftFeeding, draftEx]);

  const cancel = useCallback(() => {
    setDraftFeeding(cloneFeeding(savedFeeding));
    setDraftEx(savedEx != null ? String(savedEx) : "");
    setEditing(false);
  }, [savedFeeding, savedEx]);

  const updateFoodItem = (index: number, patch: Partial<FeedingFoodItem>) => {
    setDraftFeeding((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Care</Text>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={cancel} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.cardColumn}>
          <View style={styles.blockHeader}>
            <View style={[styles.iconCircle, styles.iconLavender]}>
              <MaterialCommunityIcons
                name="food-variant"
                size={16}
                color={Colors.lavender}
              />
            </View>
            <Text style={styles.blockTitle}>Feeding</Text>
          </View>

          {(editing ? draftFeeding : savedFeeding).items.length === 0 ? (
            <Text style={styles.empty}>No food or treats on file yet.</Text>
          ) : editing ? (
            <View style={styles.editList}>
              {draftFeeding.items.map((item, index) => (
                <View key={`edit-${index}`} style={styles.editFoodBlock}>
                  <Text style={styles.editLabel}>Brand</Text>
                  <TextInput
                    style={styles.editInput}
                    value={item.brand}
                    onChangeText={(v) => updateFoodItem(index, { brand: v })}
                    placeholder="Brand"
                    placeholderTextColor={Colors.gray400}
                  />
                  <Text style={styles.editLabel}>Portion</Text>
                  <TextInput
                    style={styles.editInput}
                    value={item.portionLabel}
                    onChangeText={(v) =>
                      updateFoodItem(index, { portionLabel: v })
                    }
                    placeholder="e.g. 2 Cups"
                    placeholderTextColor={Colors.gray400}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.list}>
              {savedFeeding.items.map((item, index) => (
                <View
                  key={`${item.brand}-${index}`}
                  style={[styles.foodRow, index > 0 && styles.foodRowBorder]}
                >
                  <View style={styles.foodRowMain}>
                    <Text style={styles.foodBrand} numberOfLines={2}>
                      {item.brand}
                    </Text>
                    {item.isTreat ? (
                      <View style={styles.treatBadge}>
                        <Text style={styles.treatBadgeText}>Treat</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.foodPortion}>{item.portionLabel}</Text>
                </View>
              ))}
            </View>
          )}

          {!editing && savedFeeding.notes.trim() ? (
            <Text style={styles.notes}>{savedFeeding.notes}</Text>
          ) : null}
          {editing ? (
            <>
              <Text style={styles.editLabel}>Notes</Text>
              <TextInput
                style={[styles.editInput, styles.editNotes]}
                value={draftFeeding.notes}
                onChangeText={(v) =>
                  setDraftFeeding((p) => ({ ...p, notes: v }))
                }
                placeholder="Optional notes"
                placeholderTextColor={Colors.gray400}
                multiline
                textAlignVertical="top"
              />
            </>
          ) : null}
        </View>

        <View style={styles.columnDivider} />

        <View style={styles.cardColumn}>
          <View style={styles.blockHeader}>
            <View style={[styles.iconCircle, styles.iconCoral]}>
              <MaterialCommunityIcons
                name="run-fast"
                size={16}
                color={Colors.coral}
              />
            </View>
            <Text style={styles.blockTitle}>Activity</Text>
          </View>

          {showExerciseCount ? (
            editing ? (
              <View style={styles.exerciseEdit}>
                <Text style={styles.editLabel}>Times per day</Text>
                <TextInput
                  style={styles.editInput}
                  value={draftEx}
                  onChangeText={setDraftEx}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={Colors.gray400}
                />
              </View>
            ) : (
              <View style={styles.exerciseStat}>
                <Text style={styles.exerciseNumber}>
                  {savedEx != null && savedEx > 0 ? String(savedEx) : "—"}
                </Text>
                <Text style={styles.exerciseCaption}>times per day</Text>
              </View>
            )
          ) : editing ? (
            <Text style={styles.muted}>
              Exercise count isn’t tracked for this pet type.
            </Text>
          ) : (
            <Text style={styles.muted}>
              {savedEx != null && savedEx > 0
                ? `${savedEx} times per day`
                : "Exercise count isn’t tracked for this pet type."}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginVertical: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  editBtn: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.orange,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cancelText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors.orange,
  },
  saveText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
  cardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    backgroundColor: Colors.gray50,
    overflow: "hidden",
  },
  cardColumn: {
    flex: 1,
    minWidth: 0,
    padding: 12,
    gap: 10,
  },
  columnDivider: {
    width: 1,
    backgroundColor: Colors.gray100,
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLavender: {
    backgroundColor: Colors.lavenderLight,
  },
  iconCoral: {
    backgroundColor: Colors.coralLight,
  },
  blockTitle: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  list: {
    gap: 0,
  },
  foodRow: {
    paddingVertical: 8,
  },
  foodRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  foodRowMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 2,
  },
  foodBrand: {
    flex: 1,
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
  },
  treatBadge: {
    backgroundColor: Colors.skyLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  treatBadgeText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 10,
    color: Colors.skyDark,
  },
  foodPortion: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notes: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  empty: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  exerciseStat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  exerciseNumber: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    minWidth: 28,
  },
  exerciseCaption: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  muted: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  editList: {
    gap: 10,
  },
  editFoodBlock: {
    gap: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  editLabel: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 11,
    color: Colors.textSecondary,
  },
  editInput: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  editNotes: {
    minHeight: 56,
    paddingTop: 8,
  },
  exerciseEdit: {
    gap: 6,
  },
});
