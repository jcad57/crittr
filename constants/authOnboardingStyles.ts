import { StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";

/**
 * Shared typography + surfaces for auth stack and onboarding steps.
 * Aligns with logged-in UI: cream context, Fraunces display titles, DM Sans body.
 */
export const authOnboardingStyles = StyleSheet.create({
  screenTitle: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.25,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 10,
  },
  screenSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  socialLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    letterSpacing: 0.8,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  body: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 12,
  },
  linkMuted: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  linkAccent: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  backText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  /** Secondary CTA: orange ring, white fill — matches Finish “Add another pet” treatment. */
  outlineButton: {
    height: 50,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButtonText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  terms: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  termsLink: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
});
