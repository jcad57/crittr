import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Pressable, Text, View } from "react-native";

type Props = {
  isNew: boolean;
  saving: boolean;
  deleting: boolean;
  showErrorHint: boolean;
  onSave: () => void;
  onDelete: () => void;
};

export default function PetMedicationFormActions({
  isNew,
  saving,
  deleting,
  showErrorHint,
  onSave,
  onDelete,
}: Props) {
  return (
    <>
      {showErrorHint ? (
        <Text style={styles.formErrorHint}>
          Please fill in the required fields above.
        </Text>
      ) : null}

      <View style={styles.actionsBlock}>
        <OrangeButton
          onPress={onSave}
          loading={saving}
          disabled={deleting}
          style={styles.saveBtn}
        >
          {isNew ? "Add medication" : "Save changes"}
        </OrangeButton>

        {!isNew ? (
          <Pressable
            onPress={onDelete}
            disabled={saving || deleting}
            style={({ pressed }) => [
              styles.deleteBtn,
              pressed && styles.deleteBtnPressed,
            ]}
          >
            <Text style={styles.deleteText}>
              {deleting ? "Deleting…" : "Delete medication"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}
