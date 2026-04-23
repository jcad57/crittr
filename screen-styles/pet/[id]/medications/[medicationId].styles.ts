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
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    lineHeight: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navSpacer: { width: 28 },
  leadReadOnly: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  scrollSafe: {
    flex: 1,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionsBlock: {
    marginTop: 20,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  formErrorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 12,
  },
  row2: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  helperLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  helperExample: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    lineHeight: 19,
    marginBottom: 12,
  },
  helperStrong: {
    fontFamily: Font.uiSemiBold,
    color: Colors.textPrimary,
  },
  previewLine: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 16,
    marginTop: -4,
  },
  smallInput: {
    width: 88,
    marginBottom: 0,
  },
  timesSpacer: {
    width: 88,
  },
  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  timeBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  reminderTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  reminderTimeBtn: {
    flex: 1,
    marginBottom: 0,
  },
  addReminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  addReminderBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  lastGivenWrap: {
    marginBottom: 12,
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
