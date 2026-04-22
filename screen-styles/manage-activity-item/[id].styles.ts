import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loggedAtHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
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
  saveBtn: {
    marginTop: 0,
  },
  errorTextMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  backLink: {
    marginTop: 12,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    textAlign: "center",
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
});
