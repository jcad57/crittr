import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
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
    paddingTop: 4,
  },
  actionsBlock: {
    paddingTop: 8,
  },
  /** Breathing room above Continue when the type grid sits just above the actions. */
  actionsAfterTypeGrid: {
    marginTop: 24,
  },
  saveBtn: {
    marginTop: 0,
  },
  cancelBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  cancelBtnPressed: {
    opacity: 0.75,
  },
  cancelText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  centeredFull: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  blockedHint: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  blockedBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    paddingHorizontal: 24,
  },
  blockedLead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginTop: 8,
  },
});
