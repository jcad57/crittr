import { Colors } from "@/constants/colors";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type PetAboutSectionProps = {
  about: string;
};

export default function PetAboutSection({ about }: PetAboutSectionProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(about);
  const [saved, setSaved] = useState(about);

  useEffect(() => {
    setValue(about);
    setSaved(about);
  }, [about]);

  function save() {
    setSaved(value);
    setEditing(false);
  }

  function cancel() {
    setValue(saved);
    setEditing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
        {!editing && (
          <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            multiline
            autoFocus
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : saved.trim() ? (
        <Text style={styles.body}>{saved}</Text>
      ) : (
        <Text style={styles.bodyEmpty}>No bio added yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  editBtn: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.orange,
  },
  body: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bodyEmpty: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.gray400,
    fontStyle: "italic",
    lineHeight: 22,
  },
  input: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  cancelText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.orange,
  },
  saveText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 14,
    color: Colors.white,
  },
});
