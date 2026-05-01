import { Colors } from "@/constants/colors";
import { StyleSheet, View } from "react-native";
import ProfileSectionHeader from "./ProfileSectionHeader";
import ProfileSupportRow from "./ProfileSupportRow";
import { PROFILE_ICONS } from "./profileIcons";

type Props = {
  onFeedback: () => void;
  onHelpCenter: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
};

export default function ProfileSupportSection({
  onFeedback,
  onHelpCenter,
  onPrivacy,
  onTerms,
}: Props) {
  return (
    <>
      <ProfileSectionHeader label="Support" />
      <View style={styles.whiteCard}>
        <ProfileSupportRow
          iconImage={PROFILE_ICONS.feedback}
          title="Share feedback"
          iconBg={Colors.mintLight}
          onPress={onFeedback}
        />
        <View style={styles.rowDivider} />
        <ProfileSupportRow
          iconImage={PROFILE_ICONS.helpCenter}
          title="Help center"
          iconBg={Colors.lavenderLight}
          onPress={onHelpCenter}
        />
        <View style={styles.rowDivider} />
        <ProfileSupportRow
          iconImage={PROFILE_ICONS.privacy}
          title="Privacy policy"
          iconBg={Colors.skyLight}
          onPress={onPrivacy}
        />
        <View style={styles.rowDivider} />
        <ProfileSupportRow
          materialIcon="file-document-outline"
          title="Terms of service"
          iconBg={Colors.amberLight}
          onPress={onTerms}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  whiteCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray100,
    marginLeft: 56,
  },
});
