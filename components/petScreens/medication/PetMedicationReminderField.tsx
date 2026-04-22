import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import ReminderTimePickerSheet from "@/components/ui/ReminderTimePickerSheet";
import { Colors } from "@/constants/colors";
import { formatReminderTimeHHmm } from "@/utils/medicationSchedule";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

type Props = {
  reminderDate: Date;
  setReminderDate: (d: Date) => void;
  showTimePicker: boolean;
  setShowTimePicker: (v: boolean) => void;
};

export default function PetMedicationReminderField({
  reminderDate,
  setReminderDate,
  showTimePicker,
  setShowTimePicker,
}: Props) {
  return (
    <>
      <Text style={styles.fieldLabel}>Reminder time</Text>
      <Pressable
        style={styles.timeBtn}
        onPress={() => setShowTimePicker(true)}
      >
        <MaterialCommunityIcons
          name="clock-outline"
          size={22}
          color={Colors.orange}
        />
        <Text style={styles.timeBtnText}>
          {formatReminderTimeHHmm(reminderDate)}
        </Text>
      </Pressable>
      <ReminderTimePickerSheet
        visible={showTimePicker}
        value={reminderDate}
        onChange={setReminderDate}
        onClose={() => setShowTimePicker(false)}
      />
    </>
  );
}
