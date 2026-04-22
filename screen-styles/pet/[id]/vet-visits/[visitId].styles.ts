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
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    minWidth: 72,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { minWidth: 72 },
  scroll: { flex: 1 },
  scrollContentGrow: {
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  formFields: {
    gap: 8,
  },
  actionsBlock: {
    paddingTop: 8,
  },
  saveBtn: {
    marginTop: 0,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notes: {
    minHeight: 100,
    paddingTop: 14,
  },
  whenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  whenText: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    flex: 1,
  },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
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
