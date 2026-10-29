import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  title: string;
  subtitle: string;
  onMarkDone: () => void;
  /** While logging; disables the action. */
  loading?: boolean;
  disabled?: boolean;
};

export default function HealthActionBanner({
  title,
  subtitle,
  onMarkDone,
  loading = false,
  disabled = false,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const blocked = disabled || loading;
  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons name="alert-circle-outline" size={26} color={Colors.peachDark} />
      </View>
      <View style={styles.mid}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Pressable
        onPress={onMarkDone}
        hitSlop={8}
        disabled={blocked}
        accessibilityState={{ disabled: blocked, busy: loading }}
        style={styles.markDoneSlot}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.orange} />
        ) : (
          <Text style={[styles.markDone, disabled && styles.markDoneDisabled]}>
            Mark done
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.peach,
    borderRadius: 24,
    paddingVertical: 17,
    paddingHorizontal: 15,
    gap: 10,
  },
  iconCircle: {
    width: 30,
    height: 40,
    borderRadius: 24,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  mid: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  sub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.peachDark,
    lineHeight: 18,
  },
  /** Keeps layout stable when swapping label for spinner. */
  markDoneSlot: {
    minWidth: 76,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: Colors.warmWhite,
  },
  markDone: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.peachDark,
  },
  markDoneDisabled: {
    opacity: 0.45,
  },
}));
