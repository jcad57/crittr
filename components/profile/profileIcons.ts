import type { ImageSourcePropType } from "react-native";

/** 40×40 tile, 26×26 artwork — matches pet profile `RecordsNavCard`. */
export const PROFILE_ICONS: Record<string, ImageSourcePropType> = {
  name: require("@/assets/icons/name-icon.png"),
  phone: require("@/assets/icons/phone-icon.png"),
  email: require("@/assets/icons/email-icon.png"),
  address: require("@/assets/icons/address-icon.png"),
  password: require("@/assets/icons/password-icon.png"),
  feedback: require("@/assets/icons/feedback-icon.png"),
  helpCenter: require("@/assets/icons/help-center-icon.png"),
  privacy: require("@/assets/icons/privacy-policy-icon.png"),
  signOut: require("@/assets/icons/sign-out-icon.png"),
};
