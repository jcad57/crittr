import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { styles } from "./ScanRecordReviewSheet.styles";

export function ScanRecordModeToggle({
  value,
  onChange,
  hasExisting,
  disabled,
}: {
  value: "skip" | "insert" | "update";
  onChange: (next: "skip" | "insert" | "update") => void;
  hasExisting: boolean;
  disabled?: boolean;
}) {
  const addMode: "insert" | "update" = hasExisting ? "update" : "insert";
  const isAdd = value === addMode;
  const toggleAdd = () => onChange(isAdd ? "skip" : addMode);
  return (
    <View style={styles.modeRow}>
      <Pressable
        onPress={toggleAdd}
        disabled={disabled}
        style={[
          styles.modeBtn,
          isAdd ? styles.modeBtnActive : styles.modeBtnInactive,
        ]}
      >
        <MaterialCommunityIcons
          name={isAdd ? "check-circle" : "circle-outline"}
          size={18}
          color={isAdd ? Colors.white : Colors.textSecondary}
        />
        <Text
          style={[
            styles.modeBtnText,
            isAdd ? styles.modeBtnTextActive : styles.modeBtnTextInactive,
          ]}
        >
          {hasExisting ? "Update existing" : "Add to Crittr"}
        </Text>
      </Pressable>
    </View>
  );
}
