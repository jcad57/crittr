import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createThemeValues, updateTheme, useSeasonalTheme, useThemeValues } from "@/theme/colors";
import { SEASONAL_THEMES, type Season } from "@/theme/seasonalThemes";
import { Font } from "@/theme/typography";
import { setSeasonalThemesEnabled } from "./seasonalPreference";

const SEASONS: readonly Season[] = ["spring", "summer", "fall", "winter"];
const SWATCH_TOKENS = ["cream", "orange", "peach", "lavender"] as const;
const label = (season: Season) => season[0].toUpperCase() + season.slice(1);

export default function SeasonalThemeSetting() {
  const { enabled, hydrated, season, preview } = useSeasonalTheme();
  const styles = useThemeValues(getStyles);
  const [saving, setSaving] = useState(false);
  const changeEnabled = async (value: boolean) => {
    setSaving(true);
    try { await setSeasonalThemesEnabled(value); }
    catch { Alert.alert("Could not save preference", "Please try changing Seasonal Themes again."); }
    finally { setSaving(false); }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="leaf" size={22} color={styles.icon.color} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title}>Seasonal Themes</Text>
          <Text style={styles.subtitle}>Seasonal colors, falling leaves in fall, and snow in winter.</Text>
        </View>
        <Switch
          accessibilityLabel="Seasonal Themes"
          accessibilityHint="Automatically change the app’s colors and backdrop with the seasons."
          value={enabled}
          disabled={!hydrated || saving}
          onValueChange={(value) => { void changeEnabled(value); }}
          trackColor={{ false: styles.trackOff.backgroundColor, true: styles.trackOn.backgroundColor }}
          thumbColor={styles.thumb.backgroundColor}
          {...(Platform.OS === "ios" ? { ios_backgroundColor: styles.trackOff.backgroundColor } : {})}
        />
      </View>

      {__DEV__ && (
        <View style={styles.preview}>
          <Text style={styles.devLabel}>Development theme preview</Text>
          <Text style={styles.subtitle}>
            {preview ? `Previewing ${label(preview)}.` : `Current season: ${label(season)}.`} Preview any theme while developing.
          </Text>
          <View style={styles.options}>
            {SEASONS.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityLabel={`Preview ${option} theme`}
                accessibilityState={{ selected: preview === option }}
                onPress={() => updateTheme({ preview: option })}
                style={({ pressed }) => [styles.option, preview === option && styles.selected, pressed && styles.pressed]}
              >
                <View style={styles.swatches}>
                  {SWATCH_TOKENS.map((token) => (
                      <View key={token} style={[styles.swatch, { backgroundColor: SEASONAL_THEMES[option].colors[token] }]} />
                    ))}
                </View>
                <Text style={styles.optionLabel}>{label(option)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset theme preview to current season"
            onPress={() => updateTheme({ preview: null })}
            style={({ pressed }) => [styles.reset, pressed && styles.pressed]}
          >
            <Text style={styles.resetLabel}>Reset to current</Text>
          </Pressable>
          <Text style={styles.note}>Preview overrides the switch for this session. Reset restores your Seasonal Themes preference.</Text>
        </View>
      )}
    </View>
  );
}

const getStyles = createThemeValues((colors) => StyleSheet.create({
  wrap: { marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.orangeLight, alignItems: "center", justifyContent: "center" },
  icon: { color: colors.orange },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: Font.uiSemiBold, fontSize: 16, color: colors.textPrimary },
  subtitle: { fontFamily: Font.uiRegular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: 4 },
  trackOff: { backgroundColor: colors.gray200 }, trackOn: { backgroundColor: colors.orange }, thumb: { backgroundColor: colors.white },
  preview: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: colors.warmWhite, borderWidth: 1, borderStyle: "dashed", borderColor: colors.creamDark, gap: 8 },
  devLabel: { fontFamily: Font.uiSemiBold, fontSize: 12, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  option: { flexBasis: "46%", flexGrow: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.white, gap: 8, minHeight: 64 },
  selected: { borderColor: colors.orangeDark, backgroundColor: colors.orangeLight },
  optionLabel: { fontFamily: Font.uiSemiBold, fontSize: 13, color: colors.textPrimary },
  swatches: { flexDirection: "row", gap: 4 }, swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.1)" },
  reset: { minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 12, backgroundColor: colors.orangeLight },
  resetLabel: { fontFamily: Font.uiSemiBold, fontSize: 14, color: colors.orangeDark },
  note: { fontFamily: Font.uiRegular, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  pressed: { opacity: 0.75 },
}));
