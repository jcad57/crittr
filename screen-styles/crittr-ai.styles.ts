import { createThemeValues } from "@/theme/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/theme/typography";
import { StyleSheet } from "react-native";

/** iMessage-style composer: ~6 visible lines then scroll inside the field. */
export const INPUT_LINE_HEIGHT = 22;
export const INPUT_MAX_VISIBLE_LINES = 6;
export const INPUT_MAX_HEIGHT = INPUT_LINE_HEIGHT * INPUT_MAX_VISIBLE_LINES + 20;

export const getStyles = createThemeValues((Colors) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.screenBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backHit: { width: 40, height: 40, justifyContent: "center" },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  headerTrailing: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollInner: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.orangeLight,
    borderWidth: 1,
    borderColor: Colors.gray200,
    gap: 6,
  },
  errorBannerText: {
    fontFamily: Font.uiMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  errorRetry: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orangeDark,
  },
  bubble: {
    maxWidth: "92%",
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    backgroundColor: Colors.peach,
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    backgroundColor: Colors.warmWhite,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    paddingBottom: 9,
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.gray400,
  },
  bubbleText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  bubbleTextUser: {
    color: Colors.textPrimary,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.cream,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: INPUT_MAX_HEIGHT,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    backgroundColor: Colors.warmWhite,
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: INPUT_LINE_HEIGHT,
    color: Colors.textPrimary,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  sendBtnPressed: { opacity: 0.88 },
  sendBtnDisabled: { opacity: 0.45 },
}));
