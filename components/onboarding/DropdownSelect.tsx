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
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type DropdownSelectProps = {
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function DropdownSelect({
  placeholder,
  value,
  options,
  onSelect,
  containerStyle,
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    Keyboard.dismiss();
  }, []);

  const handleSelect = useCallback(
    (item: string) => {
      onSelect(item);
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {isOpen && (
        <Pressable style={styles.backdrop} onPress={dismiss} />
      )}

      <View style={styles.inner}>
        <TouchableOpacity
          style={[styles.trigger, isOpen && styles.triggerOpen]}
          onPress={() => setIsOpen(!isOpen)}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.triggerText, !value && styles.triggerPlaceholder]}
            numberOfLines={1}
          >
            {value || placeholder}
          </Text>
          <MaterialCommunityIcons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color={Colors.gray400}
          />
        </TouchableOpacity>

        {isOpen && (
          <View style={styles.dropdown}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              nestedScrollEnabled
            >
              {options.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.option,
                    item === value && styles.optionActive,
                  ]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item === value && styles.optionTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color={Colors.orange}
                    />
                  )}
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
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  triggerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: Colors.orange,
  },
  triggerText: {
    flex: 1,
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  triggerPlaceholder: {
    color: Colors.gray400,
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
  optionActive: {
    backgroundColor: Colors.orangeLight,
  },
  optionText: {
    fontFamily: "InstrumentSans-Regular",
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionTextActive: {
    fontFamily: "InstrumentSans-Bold",
    color: Colors.orange,
  },
});
