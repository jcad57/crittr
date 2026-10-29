import CrittrDateTimePickerModal from "@/components/ui/pickers/CrittrDateTimePickerModal";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import {
  clampDateToRange,
  PICKER_MAX_DATE,
  PICKER_MIN_DATE,
} from "@/utils/dateTimePickerBounds";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const [pickerVisible, setPickerVisible] = useState(false);

  const resolvedMinimumDate = minimumDateProp ?? PICKER_MIN_DATE;
  const resolvedMaximumDate = maximumDateProp ?? PICKER_MAX_DATE;

  const pickerDate = useMemo(() => {
    let d: Date;
    if (!value) {
      d = new Date();
    } else {
      const [y, m, day] = value.split("-").map(Number);
      if (!y || !m || !day) d = new Date();
      else d = new Date(y, m - 1, day);
    }
    return clampDateToRange(d, resolvedMinimumDate, resolvedMaximumDate);
  }, [value, resolvedMinimumDate, resolvedMaximumDate]);

  const handleConfirm = (picked: Date) => {
    setPickerVisible(false);
    onChangeDate(
      toLocalIsoDateString(
        clampDateToRange(picked, resolvedMinimumDate, resolvedMaximumDate),
      ),
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

      <CrittrDateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={pickerDate}
        minimumDate={resolvedMinimumDate}
        maximumDate={resolvedMaximumDate}
        onConfirm={handleConfirm}
        onCancel={() => setPickerVisible(false)}
      />

      {value ? (
        <TouchableOpacity onPress={onClearDate} style={styles.clearDateButton}>
          <Text style={styles.clearDateText}>Clear date</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
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
}));
