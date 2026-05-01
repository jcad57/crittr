import {
  ProfileAboutSection,
  ProfileAccountSection,
  ProfileHero,
  ProfileNavBar,
  ProfilePetsSection,
  ProfileSignOutRow,
  ProfileSupportSection,
  displayNameFromProfile,
  formatMemberSince,
  initialsFromProfile,
} from "@/components/profile";
import { Colors } from "@/constants/colors";
import { normalizeProBannerThemeId } from "@/constants/proBannerThemes";
import {
  profileQueryKey,
  usePetsQuery,
  useProfileQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import {
  AUTH_CONTENT_MAX_WIDTH,
  useResponsiveUi,
} from "@/hooks/useResponsiveUi";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { pickAvatarImage } from "@/lib/pickImage";
import { queryClient } from "@/lib/queryClient";
import { updateProfile, uploadAvatar } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import { useCallback, useMemo, useState } from "react";
import type { Href } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Horizontal padding on `styles.content` — matches capped hero column math. */
const PROFILE_SCROLL_PADDING_H = 20;

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { windowWidth, isTablet } = useResponsiveUi();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push, router } = useNavigationCooldown();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const setProfile = useAuthStore((s) => s.setProfile);
  const activePetId = usePetStore((s) => s.activePetId);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bioEditing, setBioEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [bioSaving, setBioSaving] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useProfileQuery();
  const { data: pets = [] } = usePetsQuery();

  const titleName = useMemo(
    () => displayNameFromProfile(profile ?? null),
    [profile],
  );
  const email = session?.user?.email ?? "";
  const initials = useMemo(
    () => initialsFromProfile(profile ?? null, email),
    [profile, email],
  );
  const memberLine = useMemo(() => {
    if (!profile?.created_at) return null;
    const m = formatMemberSince(profile.created_at);
    return m ? `Member since ${m}` : null;
  }, [profile?.created_at]);

  const isPro = useIsCrittrPro(profile);
  const userId = session?.user?.id;

  const handleSignOut = async () => {
    await signOut();
  };

  const handleProfileAvatarPress = useCallback(async () => {
    if (!userId) return;
    const uri = await pickAvatarImage();
    if (!uri) return;
    setAvatarUploading(true);
    try {
      const avatarUrl = await uploadAvatar(userId, uri);
      const updated = await updateProfile(userId, { avatar_url: avatarUrl });
      if (updated) {
        setProfile(updated);
        await queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't update photo", msg);
    } finally {
      setAvatarUploading(false);
    }
  }, [userId, setProfile]);

  const startBioEdit = useCallback(() => {
    setBioDraft(profile?.bio?.trim() ?? "");
    setBioEditing(true);
  }, [profile?.bio]);

  const cancelBioEdit = useCallback(() => {
    setBioEditing(false);
    setBioDraft("");
  }, []);

  const saveBio = useCallback(async () => {
    if (!userId) return;
    setBioSaving(true);
    try {
      const trimmed = bioDraft.trim();
      const updated = await updateProfile(userId, {
        bio: trimmed.length > 0 ? trimmed : null,
      });
      if (updated) {
        setProfile(updated);
        await queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        });
        setBioEditing(false);
        setBioDraft("");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Couldn't save bio", msg);
    } finally {
      setBioSaving(false);
    }
  }, [userId, bioDraft, setProfile]);

  const openSettings = useCallback(() => {
    push("/(logged-in)/settings");
  }, [push]);

  const openEditAccount = useCallback(() => {
    push("/(logged-in)/edit-account");
  }, [push]);

  const openProBannerTheme = useCallback(() => {
    push("/(logged-in)/pro-banner-theme" as Href);
  }, [push]);

  const profileHeroColumnStyle = useMemo(() => {
    const gutter = PROFILE_SCROLL_PADDING_H * 2;
    return {
      width: "100%" as const,
      maxWidth: Math.min(AUTH_CONTENT_MAX_WIDTH, windowWidth - gutter),
      alignSelf: "center" as const,
    };
  }, [windowWidth]);

  if (isProfileLoading && !profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={{ paddingTop: insets.top + 4 }}>
        <ProfileNavBar
          title="My profile"
          onBack={() => router.back()}
          onSettingsPress={openSettings}
        />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollInsetBottom },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={profileHeroColumnStyle}>
          <ProfileHero
            isPro={isPro}
            proBannerThemeId={normalizeProBannerThemeId(
              profile?.crittr_pro_banner_theme,
            )}
            onProBannerPress={isPro ? openProBannerTheme : undefined}
            titleName={titleName}
            email={email}
            memberLine={memberLine}
            initials={initials}
            avatarUrl={profile?.avatar_url}
            avatarUploading={avatarUploading}
            onAvatarPress={handleProfileAvatarPress}
            centerIdentitySection={isTablet}
          />
        </View>

        <ProfilePetsSection
          pets={pets}
          activePetId={activePetId}
          onPetPress={(petId) => push(`/(logged-in)/pet/${petId}`)}
        />

        <ProfileAboutSection
          profile={profile ?? null}
          bioEditing={bioEditing}
          bioDraft={bioDraft}
          bioSaving={bioSaving}
          onChangeBioDraft={setBioDraft}
          onStartEdit={startBioEdit}
          onCancelEdit={cancelBioEdit}
          onSaveBio={saveBio}
        />

        <ProfileAccountSection
          profile={profile ?? null}
          email={email}
          onEditAccount={openEditAccount}
        />

        <ProfileSupportSection
          onFeedback={() => push("/(logged-in)/feedback")}
          onHelpCenter={() => push("/(logged-in)/help-center")}
          onPrivacy={() => push("/(logged-in)/privacy-policy")}
          onTerms={() => push("/terms-of-service")}
        />

        <ProfileSignOutRow onSignOut={handleSignOut} />
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: PROFILE_SCROLL_PADDING_H,
    paddingTop: 4,
    gap: 0,
  },
});
