import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { useCallback, useRef, useState } from "react";
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";

export const OTP_LENGTH = 6;

type OtpDigitsInputProps = {
  value: string;
  onChange: (digitsOnly: string) => void;
  error?: boolean;
  disabled?: boolean;
};

/**
 * Six single-digit fields with auto-advance, backspace to previous, and paste support.
 */
export default function OtpDigitsInput({
  value,
  onChange,
  error,
  disabled,
}: OtpDigitsInputProps) {
  const inputsRef = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);

  const focusAt = useCallback((i: number) => {
    inputsRef.current[Math.max(0, Math.min(i, OTP_LENGTH - 1))]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, text: string) => {
      const only = text.replace(/\D/g, "");
      if (only.length > 1) {
        const pasted = only.slice(0, OTP_LENGTH);
        onChange(pasted);
        focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
        return;
      }
      const prefix = value.slice(0, index);
      const suffix = value.slice(index + 1);
      const next = (prefix + only + suffix).replace(/\D/g, "").slice(0, OTP_LENGTH);
      onChange(next);
      if (only.length === 1 && index < OTP_LENGTH - 1) {
        focusAt(index + 1);
      }
    },
    [value, onChange, focusAt],
  );

  const onKeyPress = useCallback(
    (index: number, e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key !== "Backspace") return;
      if (value[index]) return;
      if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusAt(index - 1);
      }
    },
    [value, onChange, focusAt],
  );

  return (
    <View style={styles.wrap}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const d = value[i] ?? "";
        return (
          <TextInput
            key={i}
            ref={(r) => {
              inputsRef.current[i] = r;
            }}
            style={[
              styles.cell,
              error && styles.cellError,
              focusedIndex === i && styles.cellFocused,
              disabled && styles.cellDisabled,
            ]}
            value={d}
            onChangeText={(t) => handleChange(i, t)}
            onKeyPress={(e) => onKeyPress(i, e)}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex((f) => (f === i ? null : f))}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            editable={!disabled}
            selectTextOnFocus
            accessibilityLabel={`Digit ${i + 1} of ${OTP_LENGTH}`}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
          />
        );
      })}
    </View>
  );
}

const CELL = 48;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  cell: {
    width: CELL,
    height: CELL + 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    fontFamily: Font.uiBold,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  cellFocused: {
    borderColor: Colors.orange,
  },
  cellError: {
    borderColor: Colors.error,
  },
  cellDisabled: {
    opacity: 0.5,
  },
});
