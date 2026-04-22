import DropdownSelect from "@/components/onboarding/DropdownSelect";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { VET_VISIT_LOCATION_OTHER } from "@/utils/vetVisitLocationUi";
import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

type Props = {
  primaryVetClinic?: string | null;
  /** Selected dropdown label when `primaryVetClinic` is set; unused otherwise. */
  choice: string;
  otherText: string;
  onChoiceChange: (value: string) => void;
  onOtherTextChange: (value: string) => void;
};

export default function VetVisitLocationFields({
  primaryVetClinic,
  choice,
  otherText,
  onChoiceChange,
  onOtherTextChange,
}: Props) {
  const primary = primaryVetClinic?.trim() ?? "";
  const hasPrimary = primary.length > 0;

  const options = useMemo(() => {
    if (!hasPrimary) return [] as string[];
    return [primary, VET_VISIT_LOCATION_OTHER];
  }, [hasPrimary, primary]);

  const showOtherInput = hasPrimary && choice === VET_VISIT_LOCATION_OTHER;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Location</Text>
      {hasPrimary ? (
        <>
          <Text style={styles.hint}>
            Your pet&apos;s saved clinic, or Other to enter a different place.
          </Text>
          <View style={styles.dropdownWrap}>
            <DropdownSelect
              placeholder="Select location"
              value={choice}
              options={options}
              onSelect={onChoiceChange}
            />
          </View>
          {showOtherInput ? (
            <>
              <Text style={styles.subLabel}>Clinic name or address</Text>
              <TextInput
                style={styles.input}
                value={otherText}
                onChangeText={onOtherTextChange}
                placeholder="e.g. Emergency Animal Hospital"
                placeholderTextColor={Colors.gray400}
              />
            </>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Add a primary clinic on your pet&apos;s profile to choose it from a
            list. For now, enter where this visit will be.
          </Text>
          <Text style={styles.subLabel}>Clinic name or address</Text>
          <TextInput
            style={styles.input}
            value={otherText}
            onChangeText={onOtherTextChange}
            placeholder="Clinic name or address"
            placeholderTextColor={Colors.gray400}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 0,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  subLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 10,
    marginBottom: 6,
  },
  dropdownWrap: {
    zIndex: 40,
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
