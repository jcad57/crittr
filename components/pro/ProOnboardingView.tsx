import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { OrganicSurface, ProBenefitGrid, ProLink } from "@/components/pro/flow/ProFlowUi";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";

/** Welcome is intentionally one step; the CTA opens the full Pro action hub. */
export function ProOnboardingView({ onContinue, onSkip }: { onContinue: () => void; onSkip: () => void }) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { height } = useWindowDimensions();
  const compact = height < 900;
  return <View style={styles.body}>
    <View style={styles.confetti} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[{ x: "4%", y: 24, c: Colors.orange }, { x: "15%", y: 0, c: "#BCA0D5" }, { x: "37%", y: 10, c: "#B8C58E" }, { x: "61%", y: 7, c: "#CFB6DC" }, { x: "79%", y: 1, c: Colors.orange }, { x: "94%", y: 26, c: "#B8C58E" }].map((dot, i) => <View key={i} style={{ position: "absolute", left: dot.x as `${number}%`, top: dot.y, width: 7, height: 9, borderRadius: 4, backgroundColor: dot.c, transform: [{ rotate: `${i * 19}deg` }] }} />)}
    </View>
    <OrganicSurface variant="hero" color={Colors.featureDark} style={[styles.hero, compact && { paddingTop: 20, paddingBottom: 23, gap: 8 }]}>
      <View style={[styles.paw, compact && { width: 64, height: 64, borderRadius: 32 }]}><MaterialCommunityIcons name="paw" size={41} color={Colors.white} /></View>
      <Text style={[styles.title, compact && { fontSize: 33, lineHeight: 37 }]}>Welcome to{'\n'}Crittr Pro.</Text>
      <Text style={styles.lead}>More room for every pet{"\n"}and everyone who loves them.</Text>
    </OrganicSurface>
    <View style={[styles.benefits, compact && { marginVertical: 15 }]}><ProBenefitGrid iconsOnly /></View>
    <OrangeButton onPress={onContinue}>Let’s get started</OrangeButton>
    <ProLink onPress={onSkip}>Set up later</ProLink>
  </View>;
}
const getStyles = createThemeValues((Colors) => StyleSheet.create({
  body: { flex: 1, justifyContent: "center", paddingTop: 12, paddingBottom: 10 },
  confetti: { height: 28, marginHorizontal: 8 },
  hero: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, alignItems: "center", gap: 10 },
  paw: { width: 75, height: 75, borderRadius: 38, backgroundColor: Colors.orange, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  title: { fontFamily: Font.displayBold, fontSize: 36, lineHeight: 40, color: Colors.warmWhite, textAlign: "center", letterSpacing: -0.7 },
  lead: { fontFamily: Font.uiRegular, color: "#E9E3DB", fontSize: 16, lineHeight: 22, textAlign: "center" },
  benefits: { marginVertical: 21 },
}));
