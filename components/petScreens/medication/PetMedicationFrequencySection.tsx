import { styles } from "@/screen-styles/pet/[id]/medications/[medicationId].styles";
import DropdownSelect from "@/components/onboarding/DropdownSelect";
import FormInput from "@/components/onboarding/FormInput";
import {
  INTERVAL_UNIT_OPTIONS,
  SCHEDULE_PERIOD_OPTIONS,
  type SchedulePeriod,
} from "@/constants/medicationEditForm";
import type { MedicationDosePeriod } from "@/types/database";
import { formatMedicationEveryIntervalLabel } from "@/utils/medicationSchedule";
import { Text, View } from "react-native";

type Props = {
  schedulePeriod: SchedulePeriod;
  setSchedulePeriod: (v: SchedulePeriod) => void;
  dosesPerPeriod: string;
  setDosesPerPeriod: (v: string) => void;
  customIntervalCount: string;
  setCustomIntervalCount: (v: string) => void;
  customIntervalUnit: MedicationDosePeriod;
  setCustomIntervalUnit: (v: MedicationDosePeriod) => void;
  parsedCustomInterval: number;
  doseCountError: boolean;
  doseCountErrorWeekMonth: boolean;
  customIntervalError: boolean;
};

export default function PetMedicationFrequencySection({
  schedulePeriod,
  setSchedulePeriod,
  dosesPerPeriod,
  setDosesPerPeriod,
  customIntervalCount,
  setCustomIntervalCount,
  customIntervalUnit,
  setCustomIntervalUnit,
  parsedCustomInterval,
  doseCountError,
  doseCountErrorWeekMonth,
  customIntervalError,
}: Props) {
  return (
    <>
      <Text
        style={[
          styles.fieldLabel,
          (doseCountError ||
            doseCountErrorWeekMonth ||
            customIntervalError) &&
            styles.fieldLabelError,
        ]}
      >
        Frequency *
      </Text>
      <View style={styles.row2}>
        {schedulePeriod !== "custom" ? (
          <FormInput
            placeholder="Times"
            value={dosesPerPeriod}
            onChangeText={setDosesPerPeriod}
            keyboardType="numeric"
            containerStyle={styles.smallInput}
            error={doseCountError || doseCountErrorWeekMonth}
          />
        ) : (
          <View style={styles.timesSpacer} />
        )}
        <View style={{ flex: 1, zIndex: 35 }}>
          <DropdownSelect
            placeholder="Per"
            value={
              SCHEDULE_PERIOD_OPTIONS.find((o) => o.value === schedulePeriod)
                ?.label ?? ""
            }
            options={SCHEDULE_PERIOD_OPTIONS.map((o) => o.label)}
            onSelect={(label) => {
              const m = SCHEDULE_PERIOD_OPTIONS.find((o) => o.label === label);
              if (m) setSchedulePeriod(m.value);
            }}
          />
        </View>
      </View>

      {schedulePeriod === "custom" ? (
        <>
          <Text style={styles.helperLabel}>Custom interval</Text>
          <Text style={styles.helperExample}>
            Example: a dose every 3 months — enter{" "}
            <Text style={styles.helperStrong}>3</Text> and choose{" "}
            <Text style={styles.helperStrong}>months</Text>. That saves as
            “{formatMedicationEveryIntervalLabel(3, "month")}
            ”.
          </Text>
          <View style={styles.row2}>
            <FormInput
              placeholder="Every"
              value={customIntervalCount}
              onChangeText={setCustomIntervalCount}
              keyboardType="numeric"
              containerStyle={styles.smallInput}
              error={customIntervalError}
            />
            <View style={{ flex: 1, zIndex: 34 }}>
              <DropdownSelect
                placeholder="Interval"
                value={
                  INTERVAL_UNIT_OPTIONS.find(
                    (o) => o.value === customIntervalUnit,
                  )?.label ?? ""
                }
                options={INTERVAL_UNIT_OPTIONS.map((o) => o.label)}
                onSelect={(label) => {
                  const opt = INTERVAL_UNIT_OPTIONS.find(
                    (o) => o.label === label,
                  );
                  if (opt) setCustomIntervalUnit(opt.value);
                }}
              />
            </View>
          </View>
          {customIntervalCount.trim() !== "" &&
          Number.isFinite(parsedCustomInterval) &&
          parsedCustomInterval >= 1 ? (
            <Text style={styles.previewLine}>
              Preview:{" "}
              {formatMedicationEveryIntervalLabel(
                parsedCustomInterval,
                customIntervalUnit,
              )}
            </Text>
          ) : null}
        </>
      ) : null}
    </>
  );
}
