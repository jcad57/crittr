import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { StyleSheet } from "react-native";

export const stepStyles = StyleSheet.create({
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  typeToggleMealActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  typeToggleTreatActive: {
    backgroundColor: "#FFF0DD",
    borderColor: "#C2410C",
  },
  typeToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  typeToggleTextMeal: {
    color: Colors.orange,
  },
  typeToggleTextTreat: {
    color: "#C2410C",
  },
  row2: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    alignItems: "stretch",
  },
  portionAmt: {
    width: 100,
    marginBottom: 0,
  },
  portionUnits: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    height: 50,
  },
  unitChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  unitChipBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  unitChipActive: {
    backgroundColor: Colors.orangeLight,
  },
  unitChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  unitChipTextActive: {
    color: Colors.orange,
  },
  timesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  timeChipActive: {
    backgroundColor: Colors.orangeLight,
    borderColor: Colors.orange,
  },
  timeChipText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timeChipTextActive: {
    color: Colors.orange,
  },
  mealHint: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  portionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  portionCardMain: {
    flex: 1,
    minWidth: 0,
  },
  portionCardTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  portionCardSub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  portionCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  portionIconBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  portionIconBtnPressed: {
    opacity: 0.65,
  },
  addPortionBtn: {
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
    marginBottom: 16,
  },
  addPortionBtnError: {
    borderColor: Colors.error,
    backgroundColor: Colors.white,
  },
  addPortionBtnPressed: {
    opacity: 0.88,
  },
  addPortionBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  addPortionBtnTextError: {
    color: Colors.error,
  },
  portionCardError: {
    borderColor: Colors.error,
  },
  portionCardSubError: {
    color: Colors.error,
    fontFamily: Font.uiSemiBold,
  },
});
