import { Colors } from "@/constants/colors";
import type { ExerciseRequirements } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type PetExerciseSectionProps = {
  exercise: ExerciseRequirements;
};

export default function PetExerciseSection({ exercise }: PetExerciseSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(exercise);
  const [draft, setDraft] = useState(exercise);

  function save() {
    setSaved(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(saved);
    setEditing(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="run-fast" size={18} color={Colors.coral} />
          </View>
          <Text style={styles.title}>Exercise</Text>
        </View>
        {!editing ? (
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={cancel} hitSlop={8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={save} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {editing ? (
        <View style={styles.fields}>
          <FieldRow
            label="Walks per day"
            value={String(draft.walksPerDay)}
            onChangeText={(v) => setDraft({ ...draft, walksPerDay: Number(v) || 0 })}
            keyboardType="numeric"
          />
          <FieldRow
            label="Walk duration (minutes)"
            value={String(draft.walkDurationMinutes)}
            onChangeText={(v) =>
              setDraft({ ...draft, walkDurationMinutes: Number(v) || 0 })
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Other activities"
            value={draft.activities.join(", ")}
            onChangeText={(v) =>
              setDraft({ ...draft, activities: v.split(",").map((s) => s.trim()) })
            }
            hint="Comma-separated"
          />
        </View>
      ) : (
        <View style={styles.display}>
          <InfoRow
            icon="walk"
            label={`${saved.walksPerDay}x daily  ·  ${saved.walkDurationMinutes} min each`}
          />
          {saved.activities.map((a, i) => (
            <InfoRow key={i} icon="star-circle-outline" label={a} />
          ))}
        </View>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
}) {
  return (
    <View style={rowStyles.row}>
      <MaterialCommunityIcons name={icon} size={16} color={Colors.gray400} />
      <Text style={rowStyles.label}>{label}</Text>
    </View>
  );
}

function FieldRow({
  label,
  value,
  onChangeText,
  keyboardType,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "numeric" | "default";
  hint?: string;
}) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
      />
      {hint && <Text style={fieldStyles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    gap: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.coralLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 16,
    color: Colors.textPrimary,
  },
  editBtn: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.orange,
  },
  actionRow: {
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
  display: { gap: 8 },
  fields: { gap: 10 },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: {
    flex: 1,
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
  },
});

const fieldStyles = StyleSheet.create({
  field: { gap: 4 },
  label: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  input: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 40,
  },
  hint: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 11,
    color: Colors.gray400,
  },
});
