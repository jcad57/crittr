import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

type PetDateOfBirthFieldProps = {
  dateOfBirth: string;
  onChangeDate: (isoDate: string) => void;
  onClearDate: () => void;
  error?: boolean;
};

/** YYYY-MM-DD in local calendar (avoids UTC shift from toISOString). */
function toLocalIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function PetDateOfBirthField({
  dateOfBirth,
  onChangeDate,
  onClearDate,
  error,
}: PetDateOfBirthFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const pickerDate = useMemo(() => {
    if (!dateOfBirth) return new Date();
    const [y, m, d] = dateOfBirth.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [dateOfBirth]);

  const handleConfirm = (picked: Date) => {
    // Hide first (recommended for Android to avoid double-modal issues)
    setPickerVisible(false);
    onChangeDate(toLocalIsoDateString(picked));
  };

  const handleCancel = () => {
    setPickerVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.datePickerButton, error && styles.datePickerButtonError]}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={error ? Colors.error : Colors.gray400}
          style={styles.calendarIcon}
        />
        <Text
          style={[
            styles.datePickerText,
            !dateOfBirth && styles.datePickerPlaceholder,
            error && !dateOfBirth && styles.datePickerPlaceholderError,
          ]}
        >
          {dateOfBirth
            ? new Date(
                `${dateOfBirth}T12:00:00`,
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Date of birth"}
        </Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={pickerDate}
        maximumDate={new Date()}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmTextIOS="Save"
        cancelTextIOS="Cancel"
        buttonTextColorIOS={Colors.orange}
      />

      {dateOfBirth ? (
        <TouchableOpacity onPress={onClearDate} style={styles.clearDateButton}>
          <Text style={styles.clearDateText}>Clear date</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  datePickerButtonError: {
    borderColor: Colors.error,
  },
  calendarIcon: {
    marginRight: 10,
  },
  datePickerText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: "black",
  },
  datePickerPlaceholder: {
    color: Colors.gray400,
  },
  datePickerPlaceholderError: {
    color: Colors.error,
  },
  clearDateButton: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  clearDateText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
