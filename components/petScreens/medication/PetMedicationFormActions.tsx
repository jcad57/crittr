import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Pressable, Text, View } from "react-native";

type Props = {
  isNew: boolean;
  saving: boolean;
  showErrorHint: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export default function PetMedicationFormActions({
  isNew,
  saving,
  showErrorHint,
  onSave,
  onCancel,
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
          disabled={saving}
          style={styles.saveBtn}
        >
          {isNew ? "Add medication" : "Save changes"}
        </OrangeButton>

        <Pressable
          onPress={onCancel}
          disabled={saving}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && styles.cancelBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </>
  );
}
