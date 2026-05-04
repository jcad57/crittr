import FormInput from "@/components/onboarding/FormInput";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { profileQueryKey, useProfileQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { queryClient } from "@/lib/queryClient";
import { updateAuthPassword } from "@/services/auth";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditAccountScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);
  const sessionEmail = useAuthStore((s) => s.session?.user?.email ?? "");
  const setProfile = useAuthStore((s) => s.setProfile);

  const { data: profile, isLoading } = useProfileQuery();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [settingPassword, setSettingPassword] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name?.trim() ?? "");
    setLastName(profile.last_name?.trim() ?? "");
    setPhone(profile.phone_number?.trim() ?? "");
    setAddress(profile.home_address?.trim() ?? "");
  }, [profile]);

  /** Google/OAuth — until the user has saved a local password in Supabase. */
  const canSetLocalPassword = profile?.has_password === false;

  const handleSetPassword = useCallback(async () => {
    if (!userId || !canSetLocalPassword) return;
    if (newPassword.length < 6) {
      Alert.alert(
        "Password",
        "Use at least 6 characters so you can sign in with email and password if needed.",
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Password", "The two password fields do not match.");
      return;
    }
    setSettingPassword(true);
    try {
      await updateAuthPassword(newPassword);
      const updated = await updateProfile(userId, { has_password: true });
      if (updated) setProfile(updated);
      setNewPassword("");
      setConfirmNewPassword("");
      await queryClient.invalidateQueries({
        queryKey: profileQueryKey(userId),
      });
      Alert.alert(
        "Password saved",
        "You can now sign in with this email and password as well as Google.",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Could not save password", msg);
    } finally {
      setSettingPassword(false);
    }
  }, [
    userId,
    canSetLocalPassword,
    newPassword,
    confirmNewPassword,
    setProfile,
  ]);

  const handleSave = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const trimmedFirst = firstName.trim() || null;
      const trimmedLast = lastName.trim() || null;
      const trimmedPhone = phone.trim() || null;
      const trimmedAddress = address.trim() || null;

      const updated = await updateProfile(userId, {
        first_name: trimmedFirst,
        last_name: trimmedLast,
        phone_number: trimmedPhone,
        home_address: trimmedAddress,
      });

      if (updated) setProfile(updated);

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
    firstName,
    lastName,
    phone,
    address,
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
    <View style={styles.screen}>
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

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Update and manage your personal details.
        </Text>

        <FormInput
          label="First name"
          placeholder="First name"
          value={firstName}
          onChangeText={setFirstName}
          autoCapitalize="words"
          autoComplete="name-given"
          containerStyle={styles.fieldGap}
        />

        <FormInput
          label="Last name"
          placeholder="Last name"
          value={lastName}
          onChangeText={setLastName}
          autoCapitalize="words"
          autoComplete="name-family"
          containerStyle={styles.fieldGap}
        />

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
          value={sessionEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          disabled
          containerStyle={styles.fieldGap}
        />

        {canSetLocalPassword ? (
          <View style={styles.fieldGap}>
            <Text style={styles.fieldLabel}>
              Add a sign-in password (optional)
            </Text>
            <Text style={styles.hintText}>
              Lets you use email and password in addition to Google. We never
              see your Google password.
            </Text>
            <FormInput
              label="New password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              containerStyle={styles.subFieldGap}
            />
            <FormInput
              label="Confirm new password"
              placeholder="Re-enter password"
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              containerStyle={styles.subFieldGap}
            />
            <OrangeButton
              onPress={handleSetPassword}
              loading={settingPassword}
              style={styles.saveBtnTight}
            >
              Save password
            </OrangeButton>
          </View>
        ) : (
          <View style={styles.fieldGap}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Pressable
                onPress={() =>
                  router.push("/(logged-in)/forgot-password" as Href)
                }
                hitSlop={8}
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
              >
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>
            <View style={styles.passwordInputContainerDisabled}>
              <TextInput
                value="••••••••••"
                editable={false}
                secureTextEntry={false}
                selectTextOnFocus={false}
                style={styles.passwordInputDisabled}
                accessibilityLabel="Password. Not editable here. Use Forgot password to reset."
                accessibilityState={{ disabled: true }}
              />
            </View>
          </View>
        )}

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
          loading={saving}
          style={styles.saveBtn}
        >
          Save changes
        </OrangeButton>
      </KeyboardAwareScrollView>
    </View>
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
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  forgotLink: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
  /** Visually disabled so users don’t expect to type a new password on this screen. */
  passwordInputContainerDisabled: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray300,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: Colors.gray100,
  },
  passwordInputDisabled: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.gray500,
    paddingVertical: 0,
    letterSpacing: 2,
  },
  saveBtn: {
    marginTop: 8,
  },
  subFieldGap: {
    marginBottom: 10,
  },
  saveBtnTight: {
    marginTop: 4,
  },
  hintText: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
});
