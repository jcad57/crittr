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
  notFoundText: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
  },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  navBack: {
    minWidth: 72,
  },
  navBackText: {
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
  /** Balances the back control so the title stays centered. */
  navSpacer: {
    minWidth: 72,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 4,
  },
  sectionFlush: {
    marginBottom: 0,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 0,
    width: "100%",
  },
  sectionLabelInline: {
    marginBottom: 0,
    flexShrink: 1,
  },
  sectionEditLink: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },

  detailsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.sectionLabel,
  },
  infoValue: {
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "right",
    maxWidth: "58%",
  },

  medList: {
    gap: 10,
  },
  emptyMed: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    textAlign: "center",
    color: Colors.gray500,
    paddingVertical: 4,
  },
  coCarerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.lavenderLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  coCarerBannerText: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: Colors.lavenderDark,
  },
});
