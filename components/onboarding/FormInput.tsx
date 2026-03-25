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
  ...rest
}: FormInputProps) {
  return (
    <View
      style={[styles.container, error && styles.containerError, containerStyle]}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={error ? Colors.error : Colors.gray400}
          style={styles.icon}
        />
      )}
      <TextInput
        style={[styles.input, icon && styles.inputWithIcon, style]}
        placeholderTextColor={error ? Colors.error : Colors.gray400}
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
  containerError: {
    borderColor: Colors.error,
  },
  icon: {
    marginRight: 10,
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
});
