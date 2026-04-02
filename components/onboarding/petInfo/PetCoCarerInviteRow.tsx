import FormInput from "@/components/onboarding/FormInput";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type PetCoCarerInviteRowProps = {
  coCarerEmail: string;
  onChangeEmail: (v: string) => void;
};

export default function PetCoCarerInviteRow({
  coCarerEmail,
  onChangeEmail,
}: PetCoCarerInviteRowProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>Does anyone else help you care for this pet?</Text>
      <View style={styles.inviteRow}>
        <FormInput
          icon="email-outline"
          placeholder="Enter their email"
          value={coCarerEmail}
          onChangeText={onChangeEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          containerStyle={styles.inviteInput}
        />
        <TouchableOpacity style={styles.inviteButton}>
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  inviteRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  inviteInput: {
    flex: 1,
  },
  inviteButton: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 20,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteButtonText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
