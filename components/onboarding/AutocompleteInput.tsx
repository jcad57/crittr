import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type AutocompleteInputProps = {
  placeholder: string;
  value: string;
  onSelect: (value: string) => void;
  onChangeText: (text: string) => void;
  suggestions: string[];
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  containerStyle?: StyleProp<ViewStyle>;
  error?: boolean;
};

/**
 * Single-select autocomplete built on the exact same pattern as TagInput
 * (which works reliably). Internal query state, no external value sync,
 * no Keyboard.dismiss() on select.
 */
export default function AutocompleteInput({
  placeholder,
  value,
  onSelect,
  onChangeText,
  suggestions,
  icon,
  containerStyle,
  error,
}: AutocompleteInputProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const filtered =
    query.trim().length > 0
      ? suggestions
          .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6)
      : [];

  const showDropdown = isOpen && filtered.length > 0;

  const dismiss = useCallback(() => {
    setIsOpen(false);
    Keyboard.dismiss();
  }, []);

  const handleSelect = useCallback(
    (item: string) => {
      setQuery(item);
      onSelect(item);
      setIsOpen(false);
    },
    [onSelect],
  );

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      onChangeText(text);
      if (!isOpen) setIsOpen(true);
    },
    [onChangeText, isOpen],
  );

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {showDropdown && (
        <Pressable style={styles.backdrop} onPress={dismiss} />
      )}

      <View style={styles.inner}>
        <View
          style={[
            styles.inputContainer,
            showDropdown && styles.inputOpen,
            error && !showDropdown && styles.inputError,
          ]}
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
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={error ? Colors.error : Colors.gray400}
            value={query}
            onChangeText={handleChangeText}
            onFocus={() => setIsOpen(true)}
            autoCapitalize="words"
          />
        </View>

        {showDropdown && (
          <View style={styles.dropdown}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              nestedScrollEnabled
            >
              {filtered.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.option}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 100,
  },
  backdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    zIndex: 0,
  },
  inner: {
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  inputOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: Colors.orange,
  },
  inputError: {
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
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.orange,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: Colors.white,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  list: {
    maxHeight: 220,
  },
  option: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  optionText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
});
