import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { profileQueryKey, useProfileQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { queryClient } from "@/lib/queryClient";
import { updateAuthEmail } from "@/services/auth";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditAccountScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const sessionEmail = useAuthStore((s) => s.session?.user?.email ?? "");
  const setProfile = useAuthStore((s) => s.setProfile);

  const { data: profile, isLoading } = useProfileQuery();

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setPhone(profile.phone_number?.trim() ?? "");
    setEmail(sessionEmail);
    setAddress(profile.home_address?.trim() ?? "");
  }, [profile, sessionEmail]);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    const trimmedEmail = email.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!emailOk) {
      Alert.alert("Check email", "Enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const trimmedPhone = phone.trim() || null;
      const trimmedAddress = address.trim() || null;

      const updated = await updateProfile(userId, {
        phone_number: trimmedPhone,
        home_address: trimmedAddress,
      });

      if (updated) setProfile(updated);

      if (trimmedEmail !== sessionEmail.trim()) {
        await updateAuthEmail(trimmedEmail);
      }

      await queryClient.invalidateQueries({
        queryKey: profileQueryKey(userId),
      });

      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't save", msg);
    } finally {
      setSaving(false);
    }
  }, [
    userId,
    phone,
    email,
    address,
    sessionEmail,
    setProfile,
    router,
  ]);

  if (isLoading && !profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.navBar, { paddingTop: insets.top + 4 }]}>
        <Pressable
          style={styles.navButton}
          hitSlop={12}
          accessibilityLabel="Go back"
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Edit account
        </Text>
        <View style={styles.navButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Update your phone, email, and address. Changes save to your account.
        </Text>

        <FormInput
          label="Phone number"
          placeholder="(555) 000-0000"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          containerStyle={styles.fieldGap}
        />

        <FormInput
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          containerStyle={styles.fieldGap}
        />

        <FormInput
          label="Address"
          placeholder="Street, city, state, ZIP"
          value={address}
          onChangeText={setAddress}
          multiline
          containerStyle={styles.fieldGap}
        />

        <OrangeButton
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? "Saving…" : "Save changes"}
        </OrangeButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  fieldGap: {
    marginBottom: 16,
  },
  saveBtn: {
    marginTop: 8,
  },
});
