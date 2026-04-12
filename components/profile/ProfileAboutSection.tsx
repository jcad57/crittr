import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Profile } from "@/types/database";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ProfileSectionHeader from "./ProfileSectionHeader";

type Props = {
  profile: Profile | null;
  bioEditing: boolean;
  bioDraft: string;
  bioSaving: boolean;
  onChangeBioDraft: (text: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveBio: () => void;
};

export default function ProfileAboutSection({
  profile,
  bioEditing,
  bioDraft,
  bioSaving,
  onChangeBioDraft,
  onStartEdit,
  onCancelEdit,
  onSaveBio,
}: Props) {
  return (
    <>
      <ProfileSectionHeader
        label="About Me"
        action={
          !bioEditing ? (
            <Pressable
              onPress={onStartEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit bio"
              style={({ pressed }) => [
                styles.editBtn,
                pressed && styles.editBtnPressed,
              ]}
            >
              <Text style={styles.editBtnText}>Edit</Text>
            </Pressable>
          ) : null
        }
      />
      <View style={styles.bioCard}>
        {bioEditing ? (
          <>
            <TextInput
              value={bioDraft}
              onChangeText={onChangeBioDraft}
              multiline
              placeholder="Tell others about yourself and your pets…"
              placeholderTextColor={Colors.gray400}
              style={styles.bioInput}
              maxLength={500}
              textAlignVertical="top"
              editable={!bioSaving}
            />
            <View style={styles.bioEditActions}>
              <Pressable
                onPress={onCancelEdit}
                disabled={bioSaving}
                style={({ pressed }) => [
                  styles.bioCancelBtn,
                  pressed && !bioSaving && styles.bioCancelBtnPressed,
                  bioSaving && styles.bioBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Cancel editing bio"
              >
                <Text style={styles.bioCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSaveBio}
                disabled={bioSaving}
                style={({ pressed }) => [
                  styles.bioSaveBtn,
                  pressed && !bioSaving && styles.bioSaveBtnPressed,
                  bioSaving && styles.bioBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save bio"
              >
                {bioSaving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.bioSaveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <Text
            style={[
              styles.bioText,
              !profile?.bio?.trim() && styles.bioTextPlaceholder,
            ]}
          >
            {profile?.bio?.trim()
              ? profile.bio.trim()
              : "Add a short bio to tell others about yourself."}
          </Text>
        )}
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
  bioCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  bioText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  bioTextPlaceholder: {
    color: Colors.gray400,
    fontStyle: "italic",
  },
  bioInput: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
    minHeight: 100,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 14,
  },
  bioEditActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  bioCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  bioCancelBtnPressed: {
    backgroundColor: Colors.gray50,
  },
  bioCancelBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  bioSaveBtn: {
    minWidth: 96,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  bioSaveBtnPressed: {
    opacity: 0.92,
  },
  bioSaveBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.white,
  },
  bioBtnDisabled: {
    opacity: 0.65,
  },
});
