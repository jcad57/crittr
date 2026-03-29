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

function toLocalIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type ExpiryDateFieldProps = {
  value: string;
  onChangeDate: (isoDate: string) => void;
  onClearDate: () => void;
  placeholder?: string;
};

/** Optional future (or past) date for vaccination expiry — not limited to birth dates. */
export default function ExpiryDateField({
  value,
  onChangeDate,
  onClearDate,
  placeholder = "Expiry date (optional)",
}: ExpiryDateFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const pickerDate = useMemo(() => {
    if (!value) return new Date();
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [value]);

  const handleConfirm = (picked: Date) => {
    setPickerVisible(false);
    onChangeDate(toLocalIsoDateString(picked));
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.datePickerButton}
        onPress={() => setPickerVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={20}
          color={Colors.gray400}
          style={styles.calendarIcon}
        />
        <Text
          style={[
            styles.datePickerText,
            !value && styles.datePickerPlaceholder,
          ]}
        >
          {value
            ? new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : placeholder}
        </Text>
      </TouchableOpacity>

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={pickerDate}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
        confirmTextIOS="Save"
        cancelTextIOS="Cancel"
        buttonTextColorIOS={Colors.orange}
      />

      {value ? (
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
