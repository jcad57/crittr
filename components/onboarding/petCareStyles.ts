import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { StyleSheet } from "react-native";

/** Shared list / food / med / vac UI from the former single Pet Care step. */
export const petCareStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  /** Top-aligned onboarding form (not opt-in prompt): full width, no horizontal centering. */
  formContainer: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
  },
  iconCenter: {
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionTitleError: {
    color: Colors.error,
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
  helperText: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: -8,
  },
  inputSpacing: {
    marginBottom: 12,
  },
  reminderTimeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  reminderTimeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  foodSection: {
    marginBottom: 4,
  },
  foodNameRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    /** Bottom-align so the 50px Meal/Treat toggle lines up with the text field, not the label. */
    alignItems: "flex-end",
  },
  foodNameField: {
    flex: 1,
    minWidth: 0,
  },
  foodNameInput: {
    marginBottom: 0,
  },
  amountUnitRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  amountField: {
    flex: 1,
    minWidth: 0,
  },
  amountInputContainer: {
    marginBottom: 0,
  },
  amountUnitTogglesWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: "flex-end",
  },
  /** Matches `FormInput` container: 50px tall, 14 radius, 1px border. */
  mealTreatToggleRow: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    height: 50,
    minHeight: 50,
    maxHeight: 50,
    width: 140,
    flexShrink: 0,
  },
  mealTreatToggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  mealTreatToggleBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  mealTreatToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timesRow: {
    zIndex: 80,
  },
  timesDropdown: {
    flex: 1,
    minWidth: 0,
  },
  notesField: {
    marginBottom: 12,
    minHeight: 100,
  },
  notesMultiline: {
    minHeight: 72,
  },
  row3: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  smallInput: {
    width: 70,
  },
  portionToggleRow: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    height: 50,
    minHeight: 50,
    maxHeight: 50,
    width: "100%",
  },
  portionToggle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  portionToggleBorder: {
    borderRightWidth: 1,
    borderRightColor: Colors.gray200,
  },
  portionToggleActive: {
    backgroundColor: Colors.orangeLight,
  },
  portionToggleText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  portionToggleTextActive: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
  listCard: {
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listRowText: {
    flex: 1,
  },
  listItemBold: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  listItemSub: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  listItemNotes: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  addButton: {
    borderWidth: 1,
    borderColor: Colors.gray500,
    borderRadius: 50,
    backgroundColor: Colors.white,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  cta: {
    marginTop: 12,
  },
  errorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
});
