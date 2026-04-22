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
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
  },
  scrollContentGrow: { flexGrow: 1 },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  formMain: {
    flexShrink: 0,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginTop: 8,
  },
  policyDocsHeader: {
    marginTop: 4,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  /** Matches vaccinations list “Add vaccination” control. */
  addFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
  },
  addFileBtnPressed: {
    opacity: 0.85,
  },
  addFileBtnDisabled: {
    opacity: 0.55,
  },
  addFileBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  policyDocsHelper: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  hintWhenOff: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  paddedCenter: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
  },
  loadingDocsHint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  policyDocsLoadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  policyDocsLoadingText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fileListMuted: {
    opacity: 0.55,
  },
  emptyFiles: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fileList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  fileRowWrap: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  fileRowReadOnly: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  fileRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 10,
  },
  fileRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.skyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconPdf: {
    backgroundColor: Colors.orangeLight,
  },
  fileMid: { flex: 1, minWidth: 0 },
  fileName: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  fileMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  trashBtn: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionsBlock: {
    paddingTop: 24,
    width: "100%",
  },
  saveBtn: {
    marginTop: 0,
  },
});
