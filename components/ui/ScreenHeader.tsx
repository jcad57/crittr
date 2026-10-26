import { Colors } from "@/theme/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/theme/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * The single nav header for stack screens: back affordance, centred title, and
 * an optional trailing slot (pet avatar, action, spinner).
 *
 * Both side slots are a fixed 44pt — the iOS minimum touch target, and wide
 * enough for the largest trailing content — so the title stays optically
 * centred no matter what `right` holds.
 */
type Props = {
  title: string;
  /** Omit to render a title-only header with no back affordance. */
  onBack?: () => void;
  /** Trailing slot, e.g. `PetNavAvatar` or a refetch spinner. */
  right?: ReactNode;
  /** Defaults to 1; pass 2 for titles that legitimately wrap. */
  titleLines?: number;
  /**
   * Safe-area padding, for screens that inset the header rather than the
   * screen container. Pass `insets.top + n`.
   */
  topInset?: number;
  accessibilityLabel?: string;
};

export default function ScreenHeader({
  title,
  onBack,
  right,
  titleLines = 1,
  topInset,
  accessibilityLabel = "Go back",
}: Props) {
  return (
    <View style={[styles.nav, topInset != null && { paddingTop: topInset }]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={Colors.textPrimary}
            />
          </Pressable>
        ) : null}
      </View>

      <Text
        style={styles.title}
        numberOfLines={titleLines}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
      >
        {title}
      </Text>

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

const SIDE_WIDTH = 44;

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  side: {
    width: SIDE_WIDTH,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
});
