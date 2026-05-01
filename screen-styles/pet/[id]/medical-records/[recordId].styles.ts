import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
  },
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retry: { marginTop: 16 },
  retryText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
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
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navRight: { width: 44, alignItems: "center" },
  scroll: { flex: 1 },
  scrollContentGrow: {
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  formMain: {
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionsBlock: {
    paddingTop: 24,
    width: "100%",
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  titleInput: {
    fontFamily: Font.uiRegular,
    fontSize: 17,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  inputDisabled: {
    opacity: 0.85,
  },
  saveBtn: {
    marginTop: 0,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  addLink: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  emptyFiles: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  fileList: {
    gap: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    marginBottom: 0,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  fileMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 10,
    minWidth: 0,
  },
  fileActions: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 6,
    gap: 2,
  },
  fileActionBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 44,
  },
  fileActionBtnPressed: {
    opacity: 0.65,
  },
  fileActionBtnDisabled: {
    opacity: 0.35,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lavenderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconPdf: {
    backgroundColor: Colors.orangeLight,
  },
  fileMid: { flex: 1, minWidth: 0, gap: 4 },
  fileName: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  fileMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
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
});
