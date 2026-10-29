import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { PurchaseEnvironmentNotice } from "./PurchaseEnvironmentNotice";

export type ProIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];

export function OrganicBackdrop({ color, variant = "soft" }: {
  color: string;
  variant?: "soft" | "hero" | "tile";
}) {
  const path = variant === "hero"
    ? "M34 15C91 0 222 1 284 14C313 20 320 36 318 67L316 161C316 186 299 195 269 197L48 199C16 199 1 187 2 157L3 55C3 31 11 20 34 15Z"
    : variant === "tile"
      ? "M28 5C64 0 253 2 289 8C311 13 317 31 316 56L320 160C320 187 303 198 276 198L36 196C11 196 1 182 2 158L0 47C0 22 8 9 28 5Z"
      : "M39 40C74 4 143 -6 199 8C248 19 250 43 281 63C322 90 329 127 300 157C272 187 221 184 176 191C117 202 75 194 40 172C4 150 -13 108 12 77C19 66 26 54 39 40Z";
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="none">
        <Path d={path} fill={color} />
      </Svg>
    </View>
  );
}

export function OrganicSurface({ children, color, style, variant = "tile" }: {
  children: ReactNode; color: string; style?: StyleProp<ViewStyle>; variant?: "hero" | "tile";
}) {
  return <View style={[{ position: "relative" }, style]}><OrganicBackdrop color={color} variant={variant} />{children}</View>;
}

export function ProWordmark({ orange = false }: { orange?: boolean }) {
  const Colors = useThemeColors();
  const flowStyles = useThemeValues(getFlowStyles);
  return <Text style={[flowStyles.wordmark, orange && { color: Colors.orange }]} accessibilityLabel="Crittr Pro">Crittr<Text style={{ color: Colors.orange }}> Pro</Text></Text>;
}

export function ProFlowPage({ children, footer, onBack, brand = true, refreshing, scroll = true, compactFooter = false, footerContentStyle, showPurchaseEnvironment = false }: {
  children: ReactNode; footer?: ReactNode; onBack?: () => void; brand?: boolean;
  refreshing?: ReactNode; scroll?: boolean; compactFooter?: boolean; footerContentStyle?: StyleProp<ViewStyle>;
  showPurchaseEnvironment?: boolean;
}) {
  const Colors = useThemeColors();
  const flowStyles = useThemeValues(getFlowStyles);
  const insets = useSafeAreaInsets();
  return (
    <View style={[flowStyles.page, { paddingTop: insets.top }]}>
      <View style={flowStyles.header}>
        <View style={flowStyles.headerSide}>
          {onBack ? <Pressable onPress={onBack} style={flowStyles.back} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textPrimary} />
          </Pressable> : null}
        </View>
        {brand ? <ProWordmark /> : <View />}
        <View style={flowStyles.headerSide}>{refreshing}</View>
      </View>
      {showPurchaseEnvironment ? <PurchaseEnvironmentNotice /> : null}
      {scroll ? <ScrollView style={{ flex: 1 }} contentContainerStyle={[flowStyles.content, { paddingBottom: footer ? 12 : insets.bottom + 24 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView> : <View style={[flowStyles.content, { flex: 1 }]}>{children}</View>}
      {footer ? <View style={[flowStyles.footer, { paddingTop: compactFooter ? 6 : 10, paddingBottom: Math.max(insets.bottom, compactFooter ? 8 : 12) }]}><View style={[flowStyles.footerInner, compactFooter && { gap: 3 }, footerContentStyle]}>{footer}</View></View> : null}
    </View>
  );
}

export type ProArtKind = "companions" | "getting-ready" | "pending" | "receipt";
const ART = {
  companions: require("@/assets/images/pro/companions.png"),
  "getting-ready": require("@/assets/images/pro/getting-ready.png"),
  pending: require("@/assets/images/pro/pending.png"),
  receipt: require("@/assets/images/pro/receipt.png"),
};
export function ProIllustration({ kind = "companions", height = 180, color, style }: {
  kind?: ProArtKind; height?: number; color?: string; style?: StyleProp<ViewStyle>;
}) {
  const flowStyles = useThemeValues(getFlowStyles);
  const Colors = useThemeColors();
  return <View style={[flowStyles.art, { height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={[StyleSheet.absoluteFill, { top: "8%", left: "12%", right: "12%", bottom: "4%" }]}><OrganicBackdrop color={color ?? Colors.sage} /></View>
    <Image source={ART[kind]} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} />
  </View>;
}

export const getProFlowBenefits = createThemeValues((Colors) : { icon: ProIcon; title: string; body: string; color: string; inline?: boolean }[] => ([
  { icon: "paw", title: "Unlimited pets", body: "Care for as many pets as you love.", color: Colors.sage },
  { icon: "account-group-outline", title: "Unlimited co-carers", body: "Invite family and friends to help care.", color: Colors.lavenderLight },
  { icon: "file-document-outline", title: "Medical record storage", body: "Keep important documents safe.", color: Colors.skyLight },
  { icon: "creation-outline", title: "CrittrAI", body: "Extra help with your pet’s care and routines.", color: Colors.lavenderLight },
  { icon: "advertisements-off", title: "No ads", body: "Focus on your pets, without ads.", color: Colors.orangeLight, inline: true },
]));
export function ProBenefitGrid({ compact = false, iconsOnly = false, dense = false }: { compact?: boolean; iconsOnly?: boolean; dense?: boolean }) {
  const Colors = useThemeColors();
  const PRO_FLOW_BENEFITS = useThemeValues(getProFlowBenefits);
  const flowStyles = useThemeValues(getFlowStyles);
  return <View style={flowStyles.grid}>{PRO_FLOW_BENEFITS.map((b) => (
    b.inline ? <OrganicSurface key={b.title} color={b.color} style={flowStyles.inlineBenefit}>
      <MaterialCommunityIcons name={b.icon} size={20} color={Colors.textPrimary} />
      <Text style={flowStyles.benefitTitle}>{b.title}</Text>
      <Text style={[flowStyles.benefitBody, { flex: 1, fontSize: 11, lineHeight: 15 }]}>{b.body}</Text>
    </OrganicSurface> :
    <OrganicSurface key={b.title} color={iconsOnly ? "transparent" : b.color} style={[flowStyles.benefit, compact && { padding: 11, minHeight: 94 }, iconsOnly && { alignItems: "center", paddingVertical: 12 }, dense && { minHeight: 78, padding: 10, gap: 3 }]}>
      {iconsOnly ? <OrganicSurface color={b.color} style={flowStyles.benefitIcon}><MaterialCommunityIcons name={b.icon} size={33} color={Colors.textPrimary} /></OrganicSurface> : <MaterialCommunityIcons name={b.icon} size={dense ? 20 : compact ? 22 : 26} color={Colors.textPrimary} />}
      <Text style={[flowStyles.benefitTitle, dense && { fontSize: 12, lineHeight: 15 }, iconsOnly && { textAlign: "center" }]}>{b.title}</Text>
      <Text style={[flowStyles.benefitBody, dense && { fontSize: 11, lineHeight: 14 }, iconsOnly && { textAlign: "center" }]}>{b.body}</Text>
    </OrganicSurface>
  ))}</View>;
}

export function ProLink({ children, onPress, disabled = false, style, compact = false }: {
  children: ReactNode; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; compact?: boolean;
}) {
  const flowStyles = useThemeValues(getFlowStyles);
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" hitSlop={compact ? 6 : undefined} style={({ pressed }) => [flowStyles.linkButton, compact && { minHeight: 32, paddingHorizontal: 4 }, (pressed || disabled) && { opacity: 0.55 }, style]}><Text style={[flowStyles.link, compact && { fontSize: 12, lineHeight: 16 }]}>{children}</Text></Pressable>;
}
export function ProOutlineButton({ children, onPress, disabled = false }: { children: ReactNode; onPress: () => void; disabled?: boolean }) {
  const flowStyles = useThemeValues(getFlowStyles);
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => [flowStyles.outline, (pressed || disabled) && { opacity: 0.55 }]}><Text style={flowStyles.outlineText}>{children}</Text></Pressable>;
}
export function ProNotice({ title, message, tone = "error" }: { title?: string; message: string; tone?: "error" | "info" }) {
  const Colors = useThemeColors();
  const flowStyles = useThemeValues(getFlowStyles);
  return <View style={[flowStyles.notice, { backgroundColor: tone === "error" ? "#FCE6E2" : Colors.skyLight }]} accessibilityLiveRegion="polite" accessibilityRole={tone === "error" ? "alert" : "text"}>
    <MaterialCommunityIcons name={tone === "error" ? "alert-circle-outline" : "information-outline"} size={21} color={tone === "error" ? "#A33626" : Colors.skyDark} />
    <View style={{ flex: 1 }}>{title ? <Text style={[flowStyles.noticeTitle, tone === "info" && { color: Colors.skyDark }]}>{title}</Text> : null}<Text style={[flowStyles.noticeBody, tone === "info" && { color: Colors.skyDark }]}>{message}</Text></View>
  </View>;
}

export const getFlowStyles = createThemeValues((Colors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.screenBackground },
  header: { width: "100%", maxWidth: 540, alignSelf: "center", flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 52, paddingHorizontal: 14 },
  headerSide: { width: 54, alignItems: "center" }, back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  wordmark: { fontFamily: Font.displayBold, fontSize: 23, color: Colors.textPrimary },
  content: { flexGrow: 1, width: "100%", maxWidth: 520, alignSelf: "center", paddingHorizontal: 22, paddingTop: 8 },
  footer: { backgroundColor: Colors.cream, paddingHorizontal: 22, paddingTop: 10 }, footerInner: { width: "100%", maxWidth: 476, alignSelf: "center", gap: 8 },
  title: { fontFamily: Font.displayBold, fontSize: 32, lineHeight: 37, color: Colors.textPrimary, letterSpacing: -0.65 },
  subtitle: { fontFamily: Font.uiRegular, fontSize: 16, lineHeight: 23, color: "#66686B", marginTop: 9 },
  center: { textAlign: "center" }, art: { alignSelf: "center", width: "100%", maxWidth: 320, position: "relative" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 9 },
  benefit: { width: "48.4%", padding: 14, minHeight: 118, gap: 5 },
  inlineBenefit: { width: "100%", minHeight: 36, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  benefitTitle: { fontFamily: Font.uiBold, fontSize: 13, lineHeight: 17, color: Colors.textPrimary },
  benefitBody: { fontFamily: Font.uiRegular, fontSize: 12, lineHeight: 16, color: "#626260" },
  benefitIcon: { width: 70, height: 62, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  linkButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  link: { fontFamily: Font.uiSemiBold, fontSize: 14, color: "#626260", textAlign: "center" },
  finePrint: { fontFamily: Font.uiRegular, fontSize: 12, lineHeight: 17, color: "#626260", textAlign: "center" },
  outline: { minHeight: 50, borderWidth: 1, borderColor: "#B4AEA5", borderRadius: 25, justifyContent: "center", alignItems: "center", padding: 10 },
  outlineText: { fontFamily: Font.uiBold, fontSize: 15, color: Colors.textPrimary },
  notice: { borderRadius: 19, padding: 15, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noticeTitle: { fontFamily: Font.uiBold, color: "#A33626", fontSize: 14, lineHeight: 20 },
  noticeBody: { fontFamily: Font.uiRegular, color: "#943D30", fontSize: 13, lineHeight: 19 },
}));
