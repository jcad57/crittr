import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scrollContentGrow: {
    flexGrow: 1,
  },
  subscriptionMain: {
    flexGrow: 0,
  },
  cancelPushSpacer: {
    flexGrow: 1,
    minHeight: 24,
  },
  blockCenter: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    marginBottom: 16,
  },
  planName: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  planMeta: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  priceLine: {
    fontFamily: Font.uiSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  subLine: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    paddingVertical: 10,
    gap: 4,
  },
  rowLabel: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray200,
  },
  footnote: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.gray500,
    marginBottom: 16,
  },
  cancelOutline: {
    marginBottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.error,
    alignItems: "center",
  },
  cancelOutlineDisabled: { opacity: 0.55 },
  cancelOutlinePressed: { opacity: 0.85 },
  cancelOutlineText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.error,
  },
  errText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.error,
    marginBottom: 12,
  },
  retryBtn: { alignSelf: "flex-start" },
});
