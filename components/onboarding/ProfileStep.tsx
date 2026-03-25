import FormInput from "@/components/onboarding/FormInput";
import Divider from "@/components/ui/Divider";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
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
  const { profileData, setProfileData, nextStep, prevStep } =
    useOnboardingStore();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      let avatarUrl: string | null = null;
      if (profileData.avatarUri) {
        avatarUrl = await uploadAvatar(session.user.id, profileData.avatarUri);
      }

      try {
        const updated = await updateProfile(session.user.id, {
          display_name: profileData.displayName.trim() || null,
          bio: profileData.bio.trim() || null,
          ...(avatarUrl && { avatar_url: avatarUrl }),
        });
        if (updated) setProfile(updated);
      } catch (profileError: any) {
        console.warn("Profile update deferred:", profileError.message);
      }
    } catch (error: any) {
      console.warn("Profile step error:", error.message);
    } finally {
      setIsSubmitting(false);
      nextStep();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your profile</Text>

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

      <Divider />

      <FormInput
        placeholder="Display Name *"
        value={profileData.displayName}
        onChangeText={(v) => setProfileData({ displayName: v })}
        autoCapitalize="words"
        containerStyle={styles.inputSpacing}
      />

      <FormInput
        placeholder="Short bio *"
        value={profileData.bio}
        onChangeText={(v) => setProfileData({ bio: v })}
        containerStyle={[styles.inputSpacing, styles.bioInput]}
        multiline={true}
        numberOfLines={4}
        textAlignVertical="top"
      />

      <View style={styles.spacer} />

      <OrangeButton
        onPress={handleContinue}
        disabled={isSubmitting}
        style={styles.cta}
      >
        {isSubmitting ? <ActivityIndicator color={Colors.white} /> : "Continue"}
      </OrangeButton>

      <TouchableOpacity onPress={prevStep} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 26,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 24,
  },
  avatarSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
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
    fontFamily: "InstrumentSans-Bold",
    fontSize: 14,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 8,
    overflow: "hidden",
  },
  inputSpacing: {
    marginBottom: 12,
  },
  bioInput: {
    height: 80,
    alignItems: "flex-start",
    paddingTop: 12,
    textAlignVertical: "top",
  },
  spacer: {
    flex: 1,
  },
  cta: {
    marginTop: 24,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
  backText: {
    fontFamily: "InstrumentSans-Bold",
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
