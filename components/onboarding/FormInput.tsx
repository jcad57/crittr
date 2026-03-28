import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

type FormInputProps = TextInputProps & {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
  error?: boolean;
};

export default function FormInput({
  icon,
  containerStyle,
  style,
  error,
  multiline,
  ...rest
}: FormInputProps) {
  const isMultiline = Boolean(multiline);

  return (
    <View
      style={[
        styles.container,
        isMultiline && styles.containerMultiline,
        error && styles.containerError,
        containerStyle,
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
          icon && styles.inputWithIcon,
          isMultiline && styles.inputMultiline,
          style,
        ]}
        placeholderTextColor={error ? Colors.error : Colors.gray400}
        multiline={multiline}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
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
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
    height: "100%",
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
});
