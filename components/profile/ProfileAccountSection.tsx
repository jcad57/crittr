import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Profile } from "@/types/database";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ProfileAccountRow from "./ProfileAccountRow";
import ProfileSectionHeader from "./ProfileSectionHeader";
import { PROFILE_ICONS } from "./profileIcons";
import { accountFullNameLine } from "./profileHelpers";

type Props = {
  profile: Profile | null;
  email: string;
  onEditAccount: () => void;
};

export default function ProfileAccountSection({
  profile,
  email,
  onEditAccount,
}: Props) {
  return (
    <>
      <ProfileSectionHeader
        label="Account"
        action={
          <Pressable
            onPress={onEditAccount}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit account details"
            style={({ pressed }) => [
              styles.editBtn,
              pressed && styles.editBtnPressed,
            ]}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        }
      />
      <View style={styles.whiteCard}>
        <ProfileAccountRow
          iconImage={PROFILE_ICONS.name}
          label="Name"
          value={accountFullNameLine(profile ?? null)}
        />
        <View style={styles.rowDivider} />
        <ProfileAccountRow
          iconImage={PROFILE_ICONS.phone}
          label="Phone number"
          value={profile?.phone_number?.trim() ?? ""}
        />
        <View style={styles.rowDivider} />
        <ProfileAccountRow
          iconImage={PROFILE_ICONS.email}
          label="Email"
          value={email}
        />
        <View style={styles.rowDivider} />
        <ProfileAccountRow
          iconImage={PROFILE_ICONS.address}
          label="Address"
          value={profile?.home_address?.trim() ?? ""}
        />
        <View style={styles.rowDivider} />
        <ProfileAccountRow
          iconImage={PROFILE_ICONS.password}
          label="Password"
          value="••••••••"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  editBtnPressed: {
    opacity: 0.75,
  },
  editBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
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
