import MedicationSectionHeader from "@/components/petScreens/medication/MedicationSectionHeader";
import CrittrDateTimePickerModal from "@/components/ui/pickers/CrittrDateTimePickerModal";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import {
  clampDateToRange,
  PICKER_MIN_DATE,
} from "@/utils/dateTimePickerBounds";
import { formatUserMediumDateFromYmd } from "@/utils/userDateTimeFormat";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function toLocalIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  value: string;
  onChangeDate: (isoDate: string) => void;
  onClearDate: () => void;
  helperText: string;
  maximumDate: Date;
};

export default function PetMedicationLastGivenSection({
  value,
  onChangeDate,
  onClearDate,
  helperText,
  maximumDate,
}: Props) {
  const { dateDisplay } = useUserDateTimePrefs();
  const [pickerVisible, setPickerVisible] = useState(false);

  const pickerDate = useMemo(() => {
    let d: Date;
    if (!value) {
      d = new Date();
    } else {
      const [y, m, day] = value.split("-").map(Number);
      if (!y || !m || !day) d = new Date();
      else d = new Date(y, m - 1, day);
    }
    return clampDateToRange(d, PICKER_MIN_DATE, maximumDate);
  }, [value, maximumDate]);

  const dateLabel = value
    ? formatUserMediumDateFromYmd(value, dateDisplay) || "Select date"
    : "Select date";

  return (
    <View style={styles.wrap}>
      <MedicationSectionHeader icon="calendar-outline" label="Last given" />
      <View style={styles.row}>
        <Text
          style={[styles.dateText, !value && styles.datePlaceholder]}
          numberOfLines={1}
        >
          {dateLabel}
        </Text>
        <Pressable
          onPress={() => setPickerVisible(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit last given date"
        >
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>
      {/* <Text style={styles.helper}>{helperText}</Text> */}
      {value ? (
        <Pressable
          onPress={onClearDate}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear last given date"
        >
          <Text style={styles.clearText}>Clear date</Text>
        </Pressable>
      ) : null}

      <CrittrDateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        date={pickerDate}
        minimumDate={PICKER_MIN_DATE}
        maximumDate={maximumDate}
        onConfirm={(picked) => {
          setPickerVisible(false);
          onChangeDate(
            toLocalIsoDateString(
              clampDateToRange(picked, PICKER_MIN_DATE, maximumDate),
            ),
          );
        }}
        onCancel={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  dateText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  datePlaceholder: {
    fontFamily: Font.uiRegular,
    color: Colors.gray400,
  },
  editText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  helper: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 19,
    marginBottom: 4,
  },
  clearBtn: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  clearText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
