import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

type FormInputProps = TextInputProps & {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
  error?: boolean;
  /** Shown below the field when set (e.g. validation). */
  errorMessage?: string;
  /** Renders above the input; use with `required` for a trailing * on the label only. */
  label?: string;
  required?: boolean;
  /** Non-interactive with muted container/text (read-only fields). */
  disabled?: boolean;
};

export default function FormInput({
  icon,
  containerStyle,
  style,
  error,
  errorMessage,
  multiline,
  label,
  required,
  disabled,
  editable,
  selectTextOnFocus,
  accessibilityState,
  ...rest
}: FormInputProps) {
  const isMultiline = Boolean(multiline);
  const isDisabled = Boolean(disabled);
  const effectiveEditable = isDisabled ? false : editable;

  const inputRow = (
    <View
      style={[
        styles.container,
        isDisabled && styles.containerDisabled,
        isMultiline && styles.containerMultiline,
        error && styles.containerError,
      ]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={error ? Colors.error : Colors.gray400}
          style={[styles.icon, isMultiline && styles.iconMultiline]}
        />
      )}
      <TextInput
        style={[
          styles.input,
          isDisabled && styles.inputDisabled,
          icon && styles.inputWithIcon,
          isMultiline ? styles.inputMultiline : styles.inputSingleLine,
          style,
        ]}
        placeholderTextColor={error ? Colors.error : Colors.gray400}
        multiline={multiline}
        {...rest}
        editable={effectiveEditable}
        selectTextOnFocus={isDisabled ? false : selectTextOnFocus}
        accessibilityState={{
          ...accessibilityState,
          disabled: isDisabled ? true : accessibilityState?.disabled,
        }}
        {...(!isMultiline && Platform.OS === "android"
          ? { textAlignVertical: "center" as const }
          : {})}
      />
    </View>
  );

  const errorText =
    errorMessage && errorMessage.length > 0 ? (
      <Text style={styles.errorMessage}>{errorMessage}</Text>
    ) : null;

  if (label) {
    return (
      <View style={containerStyle}>
        <Text style={[styles.fieldLabel, error && styles.fieldLabelError]}>
          {label}
          {required ? " *" : ""}
        </Text>
        {inputRow}
        {errorText}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      {inputRow}
      {errorText}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  containerDisabled: {
    backgroundColor: Colors.gray100,
    borderColor: Colors.gray300,
  },
  /** Taller field with icon pinned to top so placeholder/text align with phone row. */
  containerMultiline: {
    minHeight: 88,
    height: undefined,
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
  },
  containerError: {
    borderColor: Colors.error,
  },
  icon: {
    marginRight: 10,
  },
  iconMultiline: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputDisabled: {
    color: Colors.gray500,
  },
  /** Avoid `height: "100%"` — it can become NaN during keyboard/layout and trigger CoreGraphics warnings on iOS. */
  inputSingleLine: {
    paddingVertical: 0,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    minHeight: 64,
    height: undefined,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "top",
  },
  errorMessage: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.error,
    marginTop: 6,
    alignSelf: "stretch",
  },
});
