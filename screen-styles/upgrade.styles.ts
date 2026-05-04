import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  topBar: {
    paddingBottom: 12,
  },
  topBarInner: {
    minHeight: 44,
    justifyContent: "center",
  },
  topTitleWrap: {
    position: "absolute",
    left: 52,
    right: 52,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  topTierNameCentered: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: Colors.white,
    textAlign: "center",
    width: "100%",
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    zIndex: 1,
  },
  backInRow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  goProInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    flexShrink: 0,
  },
  goProInlineText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.orange,
  },
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    paddingHorizontal: 20,
  },
  /** Full-bleed content on gradient — no inset “card” panel. */
  cardShell: {
    paddingBottom: 0,
  },
  billingToggleInCard: {
    flexDirection: "row",
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  toggleSegInCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  toggleSegInCardActive: {
    backgroundColor: Colors.orange,
  },
  toggleSegTextInCard: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: "rgba(255,255,255,0.65)",
  },
  toggleSegTextInCardActive: {
    color: Colors.white,
  },
  priceBlock: {
    marginBottom: 14,
  },
  priceRowWithSave: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  priceColumn: {
    flex: 1,
    minWidth: 0,
  },
  saveBadgePrice: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  saveBadgePriceText: {
    fontFamily: Font.uiBold,
    fontSize: 12,
    color: Colors.white,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  priceHuge: {
    fontFamily: Font.displayBold,
    fontSize: 40,
    letterSpacing: -1,
    color: Colors.textPrimary,
  },
  priceOnDark: {
    color: Colors.white,
  },
  priceSide: {
    marginBottom: 6,
  },
  billingCadenceOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
  },
  billedYearlyOnDark: {
    fontFamily: Font.uiMedium,
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  billingCadenceDark: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 4,
  },
  equivalentLine: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
    marginTop: 6,
  },
  cardDescriptionOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.78)",
    marginBottom: 16,
  },
  dottedRuleLight: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
    marginBottom: 16,
  },
  featureListLabelOnDark: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.4,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  featureRowIcon: {
    paddingTop: 2,
    minWidth: 28,
    alignItems: "center",
  },
  featureRowText: {
    flex: 1,
  },
  featureRowTitleOnDark: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.white,
  },
  featureRowSubOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  /** Space between feature list and trial disclaimer / CTAs */
  featuresEndSpacer: {
    height: 24,
  },
  checkBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    maxWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillPro: {
    backgroundColor: Colors.orangeLight,
    borderWidth: 1,
    borderColor: "rgba(252, 141, 44, 0.35)",
  },
  pillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 10,
    color: Colors.gray700,
    textAlign: "center",
  },
  pillTextPro: {
    color: Colors.orangeDark,
  },
  cta: {
    marginTop: 12,
    marginBottom: 8,
  },
  noThanksBtn: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  noThanksBtnPressed: {
    opacity: 0.7,
  },
  noThanksText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  disclaimerOnDark: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginBottom: 4,
  },
});
