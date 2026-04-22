import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  navSpacerWide: { width: 28 },
  leadReadOnly: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    lineHeight: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scrollSafe: {
    flex: 1,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  field: {
    marginBottom: 16,
  },
  expiryBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  actionsBlock: {
    marginTop: 20,
  },
  saveBtn: {
    marginTop: 0,
  },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  deleteBtnPressed: {
    opacity: 0.75,
  },
  deleteText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  backLink: {
    marginTop: 16,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    textAlign: "center",
  },
});
