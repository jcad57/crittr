import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { profileQueryKey } from "@/hooks/queries";
import { queryClient } from "@/lib/queryClient";
import { updateProfile, uploadAvatar } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileStep() {
  const {
    profileData,
    setProfileData,
    nextStep,
    prevStep,
    setSkippedPendingInvitesEmpty,
  } = useOnboardingStore();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const addressOk = Boolean(profileData.homeAddress.trim());
  const phoneOk = Boolean(profileData.phoneNumber.trim());
  const profileValid = addressOk && phoneOk;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileData({ avatarUri: result.assets[0].uri });
    }
  };

  const handleContinue = async () => {
    if (!session) return;
    setAttempted(true);
    if (!profileValid) return;

    setIsSubmitting(true);
    setSkippedPendingInvitesEmpty(false);
    try {
      let avatarUrl: string | null = null;
      if (profileData.avatarUri) {
        avatarUrl = await uploadAvatar(session.user.id, profileData.avatarUri);
      }

      try {
        const updated = await updateProfile(session.user.id, {
          bio: profileData.bio.trim() || null,
          home_address: profileData.homeAddress.trim(),
          phone_number: profileData.phoneNumber.trim(),
          ...(avatarUrl && { avatar_url: avatarUrl }),
        });
        if (updated) {
          setProfile(updated);
          queryClient.invalidateQueries({
            queryKey: profileQueryKey(session.user.id),
          });
        }
      } catch (profileError: unknown) {
        const msg =
          profileError instanceof Error
            ? profileError.message
            : String(profileError);
        console.warn("Profile update deferred:", msg);
      }

      nextStep();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Profile step error:", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 24 }]}>
        Set up your profile
      </Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarCircle} onPress={pickImage}>
          {profileData.avatarUri ? (
            <Image
              source={{ uri: profileData.avatarUri }}
              style={styles.avatarImage}
            />
          ) : (
            <MaterialCommunityIcons
              name="account"
              size={48}
              color={Colors.gray300}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage}>
          <Text style={styles.uploadLabel}>Upload Photo</Text>
        </TouchableOpacity>
      </View>

      {/* <Divider /> */}
      <Text style={authOnboardingStyles.sectionTitle}>Basic Info</Text>
      <FormInput
        label="Home address"
        required
        placeholder="Street, city, ZIP"
        value={profileData.homeAddress}
        onChangeText={(v) => setProfileData({ homeAddress: v })}
        autoCapitalize="words"
        containerStyle={[styles.inputSpacing, styles.homeAddressContainer]}
        multiline
        numberOfLines={2}
        icon="map-marker-outline"
        style={styles.homeAddressInput}
        error={attempted && !addressOk}
      />

      <FormInput
        label="Phone number"
        required
        placeholder="Mobile or home"
        value={profileData.phoneNumber}
        onChangeText={(v) => setProfileData({ phoneNumber: v })}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        containerStyle={styles.inputSpacing}
        icon="phone-outline"
        error={attempted && !phoneOk}
      />

      <FormInput
        placeholder="Short bio (max 320 characters)"
        value={profileData.bio}
        onChangeText={(v) => setProfileData({ bio: v })}
        containerStyle={[styles.inputSpacing, styles.bioInputContainer]}
        multiline
        numberOfLines={4}
        maxLength={320}
        icon="text-box-outline"
        style={styles.bioTextInput}
      />

      <View style={styles.spacer} />

      {attempted && !profileValid ? (
        <Text style={styles.errorHint}>
          Home address and phone number are required.
        </Text>
      ) : null}

      <OrangeButton
        onPress={handleContinue}
        disabled={isSubmitting}
        style={styles.cta}
      >
        {isSubmitting ? <ActivityIndicator color={Colors.white} /> : "Continue"}
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray100,
    borderWidth: 2,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  uploadLabel: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.orange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.orange,
    borderRadius: 999,
    overflow: "hidden",
  },
  inputSpacing: {
    marginBottom: 12,
  },
  /** Tighter than FormInput default multiline (~3 lines) — two lines of text only. */
  homeAddressContainer: {
    minHeight: 68,
    paddingTop: 10,
    paddingBottom: 10,
  },
  homeAddressInput: {
    minHeight: 44,
    maxHeight: 44,
  },
  bioInputContainer: {
    minHeight: 112,
  },
  bioTextInput: {
    minHeight: 88,
  },
  spacer: {
    flex: 1,
  },
  errorHint: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.error,
    textAlign: "center",
    marginBottom: 8,
  },
  cta: {
    marginTop: 24,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
});
