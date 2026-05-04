import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
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

function clampDate(d: Date, min: Date, max: Date): Date {
  const t = d.getTime();
  const tMin = min.getTime();
  const tMax = max.getTime();
  if (t < tMin) return new Date(min);
  if (t > tMax) return new Date(max);
  return d;
}

type ExpiryDateFieldProps = {
  value: string;
  onChangeDate: (isoDate: string) => void;
  onClearDate: () => void;
  placeholder?: string;
  /** When set (or when using fallbacks), paired with `maximumDate` avoids iOS/Android spinner bugs near the Unix epoch. */
  minimumDate?: Date;
  maximumDate?: Date;
};

/** Optional future (or past) date for vaccination expiry — not limited to birth dates. */
export default function ExpiryDateField({
  value,
  onChangeDate,
  onClearDate,
  placeholder = "Expiry date (optional)",
  minimumDate: minimumDateProp,
  maximumDate: maximumDateProp,
}: ExpiryDateFieldProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const fallbackMinRef = useRef(new Date(1900, 0, 1));
  const fallbackMaxRef = useRef(new Date(2100, 11, 31));

  const resolvedMinimumDate =
    minimumDateProp ?? fallbackMinRef.current;
  const resolvedMaximumDate =
    maximumDateProp ?? fallbackMaxRef.current;

  const pickerDate = useMemo(() => {
    let d: Date;
    if (!value) {
      d = new Date();
    } else {
      const [y, m, day] = value.split("-").map(Number);
      if (!y || !m || !day) d = new Date();
      else d = new Date(y, m - 1, day);
    }
    return clampDate(d, resolvedMinimumDate, resolvedMaximumDate);
  }, [value, resolvedMinimumDate, resolvedMaximumDate]);

  const handleConfirm = (picked: Date) => {
    setPickerVisible(false);
    onChangeDate(
      toLocalIsoDateString(clampDate(picked, resolvedMinimumDate, resolvedMaximumDate)),
    );
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
        minimumDate={resolvedMinimumDate}
        maximumDate={resolvedMaximumDate}
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
    backgroundColor: Colors.white,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  calendarIcon: {
    marginRight: 10,
  },
  datePickerText: {
    fontFamily: Font.uiRegular,
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
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
