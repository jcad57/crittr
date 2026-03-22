import { Colors } from "@/constants/colors";
import type { FeedingSchedule } from "@/data/mockDashboard";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

type PetFeedingSectionProps = {
  feeding: FeedingSchedule;
};

export default function PetFeedingSection({ feeding }: PetFeedingSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(feeding);
  const [draft, setDraft] = useState(feeding);

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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="food-variant" size={18} color={Colors.lavender} />
          </View>
          <Text style={styles.title}>Feeding</Text>
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

      {/* Content */}
      {editing ? (
        <View style={styles.editFields}>
          <EditRow
            label="Meals per day"
            value={String(draft.mealsPerDay)}
            onChangeText={(v) => setDraft({ ...draft, mealsPerDay: Number(v) || 0 })}
            keyboardType="numeric"
          />
          <EditRow
            label="Portion size"
            value={draft.portionSize}
            onChangeText={(v) => setDraft({ ...draft, portionSize: v })}
          />
          <EditRow
            label="Food brand"
            value={draft.foodBrand}
            onChangeText={(v) => setDraft({ ...draft, foodBrand: v })}
          />
          <EditRow
            label="Feeding times"
            value={draft.feedingTimes.join(", ")}
            onChangeText={(v) =>
              setDraft({ ...draft, feedingTimes: v.split(",").map((s) => s.trim()) })
            }
            hint="Comma-separated, e.g. 7:00 AM, 6:00 PM"
          />
          <EditRow
            label="Notes"
            value={draft.notes}
            onChangeText={(v) => setDraft({ ...draft, notes: v })}
            multiline
          />
        </View>
      ) : (
        <View style={styles.display}>
          <InfoRow icon="silverware-fork-knife" label={`${saved.mealsPerDay}x daily`} />
          <InfoRow icon="bowl-mix-outline" label={`${saved.portionSize} of ${saved.foodBrand}`} />
          <InfoRow icon="clock-outline" label={saved.feedingTimes.join("  ·  ")} />
          {saved.notes ? <InfoRow icon="note-text-outline" label={saved.notes} muted /> : null}
        </View>
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  muted,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  muted?: boolean;
}) {
  return (
    <View style={infoStyles.row}>
      <MaterialCommunityIcons name={icon} size={16} color={Colors.gray400} />
      <Text style={[infoStyles.label, muted && infoStyles.muted]}>{label}</Text>
    </View>
  );
}

function EditRow({
  label,
  value,
  onChangeText,
  keyboardType,
  hint,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "numeric" | "default";
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <View style={editStyles.field}>
      <Text style={editStyles.label}>{label}</Text>
      <TextInput
        style={[editStyles.input, multiline && editStyles.multiline]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
      {hint && <Text style={editStyles.hint}>{hint}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    backgroundColor: Colors.lavenderLight,
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
  display: {
    gap: 8,
  },
  editFields: {
    gap: 10,
  },
});

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  label: {
    flex: 1,
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  muted: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});

const editStyles = StyleSheet.create({
  field: {
    gap: 4,
  },
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
  multiline: {
    height: 72,
    textAlignVertical: "top",
  },
  hint: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 11,
    color: Colors.gray400,
  },
});
