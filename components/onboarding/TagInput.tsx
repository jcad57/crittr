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

type TagInputProps = {
  placeholder: string;
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  suggestions: string[];
  containerStyle?: StyleProp<ViewStyle>;
};

export default function TagInput({
  placeholder,
  tags,
  onAddTag,
  onRemoveTag,
  suggestions,
  containerStyle,
}: TagInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const available = suggestions.filter((s) => !tags.includes(s));

  const filtered =
    query.trim().length > 0
      ? available
          .filter((s) => s.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6)
      : isOpen
        ? available.slice(0, 6)
        : [];

  const showDropdown = isOpen && filtered.length > 0;

  const dismiss = useCallback(() => {
    setIsOpen(false);
    Keyboard.dismiss();
  }, []);

  const handleSelect = useCallback(
    (item: string) => {
      onAddTag(item);
      setQuery("");
    },
    [onAddTag],
  );

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      setQuery("");
    }
  };

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (!isOpen) setIsOpen(true);
    },
    [isOpen],
  );

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Backdrop to capture outside taps */}
      {showDropdown && (
        <Pressable style={styles.backdrop} onPress={dismiss} />
      )}

      <View style={styles.inner}>
        {/* Input */}
        <View
          style={[styles.inputContainer, showDropdown && styles.inputOpen]}
        >
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={Colors.gray400}
            value={query}
            onChangeText={handleChangeText}
            onFocus={() => setIsOpen(true)}
            onSubmitEditing={handleSubmit}
            returnKeyType="done"
            autoCapitalize="words"
          />
        </View>

        {/* Dropdown */}
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
                  <MaterialCommunityIcons
                    name="plus"
                    size={16}
                    color={Colors.gray400}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => onRemoveTag(tag)} hitSlop={6}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={16}
                  color={Colors.orange}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    zIndex: 50,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.orangeLight,
    borderRadius: 20,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
  },
  tagText: {
    fontFamily: "InstrumentSans-SemiBold",
    fontSize: 13,
    color: Colors.orange,
  },
});
