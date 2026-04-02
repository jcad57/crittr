import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  profileQueryKey,
  usePetsQuery,
  useProfileQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { pickAvatarImage } from "@/lib/pickImage";
import { queryClient } from "@/lib/queryClient";
import { updateProfile, uploadAvatar } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { Pet, Profile } from "@/types/database";
import { formatPetTypeLabel } from "@/utils/petDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function displayNameFromProfile(p: Profile | null): string {
  if (!p) return "Your name";
  const dn = p.display_name?.trim();
  if (dn) return dn;
  const parts = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return "Your name";
}

function initialsFromProfile(p: Profile | null, email: string): string {
  if (!p) return email?.[0]?.toUpperCase() ?? "?";
  const fn = p.first_name?.trim();
  const ln = p.last_name?.trim();
  if (fn?.[0] && ln?.[0]) return `${fn[0]}${ln[0]}`.toUpperCase();
  const dn = p.display_name?.trim();
  if (dn) {
    const parts = dn.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return dn.slice(0, 2).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

function formatMemberSince(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  } catch {
    return null;
  }
}

function petSubtitle(p: Pet): string {
  const breed = p.breed?.trim();
  if (breed) return breed;
  return formatPetTypeLabel(p.pet_type);
}

type AccountRowProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  value: string;
};

function AccountRow({ icon, label, value }: AccountRowProps) {
  return (
    <View style={styles.cardRow}>
      <View style={[styles.iconTile, styles.iconTileAccount]}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.orange} />
      </View>
      <View style={styles.accountRowMid}>
        <Text style={styles.accountLabel}>{label}</Text>
        <Text style={styles.accountValue} numberOfLines={2}>
          {value.trim() || "—"}
        </Text>
      </View>
    </View>
  );
}

type SupportRowProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
};

function SupportRow({
  icon,
  title,
  iconBg,
  iconColor,
  onPress,
}: SupportRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardRow,
        pressed && styles.cardRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconTile, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.supportTitle}>{title}</Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.gray400}
      />
    </Pressable>
  );
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { push, replace, router } = useNavigationCooldown();
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

  const handleSignOut = async () => {
    await signOut();
    replace("/(auth)/welcome");
  };

  const userId = session?.user?.id;

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

  const placeholder = () =>
    Alert.alert(
      "Coming soon",
      "This action will be available in a future update.",
    );

  const openEditAccount = useCallback(() => {
    push("/(logged-in)/edit-account");
  }, [push]);

  const openForgotPassword = useCallback(() => {
    push("/(logged-in)/forgot-password");
  }, [push]);

  if (isProfileLoading && !profile) {
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
            name="arrow-left"
            size={24}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          My profile
        </Text>
        <Pressable
          style={styles.navButton}
          hitSlop={12}
          accessibilityLabel="Settings"
          onPress={placeholder}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={Colors.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollInsetBottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Pressable
              onPress={handleProfileAvatarPress}
              disabled={avatarUploading}
              style={({ pressed }) => [
                styles.heroAvatarOuter,
                pressed && styles.heroAvatarPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
            >
              <View style={styles.heroAvatarClip}>
                {profile?.avatar_url?.trim() ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.heroAvatarImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <Text style={styles.heroInitials}>{initials}</Text>
                )}
                {avatarUploading ? (
                  <View style={styles.heroAvatarOverlay}>
                    <ActivityIndicator color={Colors.white} />
                  </View>
                ) : null}
              </View>
              {!avatarUploading ? (
                <View style={styles.heroPencilBadge} pointerEvents="none">
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={14}
                    color={Colors.black}
                  />
                </View>
              ) : null}
            </Pressable>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroName}>{titleName}</Text>
              <Text style={styles.heroEmail}>{email || "—"}</Text>
              {memberLine ? (
                <Text style={styles.heroMember}>{memberLine}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Pets ───────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>My pets</Text>
        </View>
        {pets.length === 0 ? (
          <View style={styles.petsEmptyCard}>
            <Text style={styles.petsEmptyText}>
              No pets yet. Add one from the home screen.
            </Text>
          </View>
        ) : (
          <View style={styles.petGrid}>
            {pets.map((pet) => {
              const uri = pet.avatar_url?.trim();
              return (
                <Pressable
                  key={pet.id}
                  style={({ pressed }) => [
                    styles.petCard,
                    pressed && styles.petCardPressed,
                  ]}
                  onPress={() => push(`/(logged-in)/pet/${pet.id}`)}
                >
                  <View style={styles.petCardAvatar}>
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={styles.petCardAvatarImg}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <MaterialCommunityIcons
                        name="paw"
                        size={28}
                        color={Colors.orange}
                      />
                    )}
                  </View>
                  <Text style={styles.petCardName} numberOfLines={1}>
                    {pet.name}
                  </Text>
                  <Text style={styles.petCardBreed} numberOfLines={1}>
                    {petSubtitle(pet)}
                  </Text>
                  {pet.id === activePetId ? (
                    <View style={styles.activeDot} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.aboutSectionHeader}>
          <Text style={styles.sectionLabel}>About</Text>
          {!bioEditing ? (
            <Pressable
              onPress={startBioEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Edit bio"
              style={({ pressed }) => [
                styles.bioEditHeaderBtn,
                pressed && styles.bioEditHeaderBtnPressed,
              ]}
            >
              <Text style={styles.bioEditHeaderBtnText}>Edit</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.bioCard}>
          {bioEditing ? (
            <>
              <TextInput
                value={bioDraft}
                onChangeText={setBioDraft}
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
                  onPress={cancelBioEdit}
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
                  onPress={saveBio}
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

        {/* ── Account ───────────────────────────────────── */}
        <View style={styles.aboutSectionHeader}>
          <Text style={styles.sectionLabel}>Account</Text>
          <Pressable
            onPress={openEditAccount}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit account details"
            style={({ pressed }) => [
              styles.bioEditHeaderBtn,
              pressed && styles.bioEditHeaderBtnPressed,
            ]}
          >
            <Text style={styles.bioEditHeaderBtnText}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.whiteCard}>
          <AccountRow
            icon="account-outline"
            label="First name"
            value={profile?.first_name?.trim() ?? ""}
          />
          <View style={styles.rowDivider} />
          <AccountRow
            icon="account-outline"
            label="Last name"
            value={profile?.last_name?.trim() ?? ""}
          />
          <View style={styles.rowDivider} />
          <AccountRow
            icon="phone-outline"
            label="Phone number"
            value={profile?.phone_number?.trim() ?? ""}
          />
          <View style={styles.rowDivider} />
          <AccountRow icon="email-outline" label="Email" value={email} />
          <View style={styles.rowDivider} />
          <AccountRow
            icon="map-marker-outline"
            label="Address"
            value={profile?.home_address?.trim() ?? ""}
          />
          <View style={styles.rowDivider} />
          <AccountRow icon="lock-outline" label="Password" value="••••••••" />
        </View>

        {/* ── Support ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Support</Text>
        </View>
        <View style={styles.whiteCard}>
          <SupportRow
            icon="message-processing-outline"
            title="Share feedback"
            iconBg={Colors.mintLight}
            iconColor={Colors.successDark}
            onPress={() =>
              Linking.openURL("mailto:support@crittr.app?subject=Feedback")
            }
          />
          <View style={styles.rowDivider} />
          <SupportRow
            icon="help-circle-outline"
            title="Help center"
            iconBg={Colors.lavenderLight}
            iconColor={Colors.lavenderDark}
            onPress={placeholder}
          />
          <View style={styles.rowDivider} />
          <SupportRow
            icon="file-document-outline"
            title="Privacy policy"
            iconBg={Colors.lavenderLight}
            iconColor={Colors.lavenderDark}
            onPress={placeholder}
          />
        </View>

        {/* ── Sign out ───────────────────────────────────── */}
        <TouchableOpacity
          style={styles.signOutCard}
          onPress={handleSignOut}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <View style={styles.signOutIconBox}>
            <MaterialCommunityIcons
              name="logout"
              size={22}
              color={Colors.signOutCoral}
            />
          </View>
          <Text style={styles.signOutText}>Sign out</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const HERO_RADIUS = 24;

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
    paddingTop: 4,
    gap: 0,
  },

  heroCard: {
    backgroundColor: Colors.profileHeroDark,
    borderRadius: HERO_RADIUS,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  /** Room for the camera badge on the rim without clipping (see heroAvatarClip). */
  heroAvatarOuter: {
    width: 80,
    height: 80,
    position: "relative",
  },
  heroAvatarClip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroAvatarPressed: {
    opacity: 0.9,
  },
  heroAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPencilBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 4,
  },
  heroAvatarImage: {
    width: "100%",
    height: "100%",
  },
  heroInitials: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.white,
  },
  heroTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  heroName: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.white,
  },
  heroEmail: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  heroMember: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },

  sectionHeader: {
    marginBottom: 10,
    marginTop: 8,
  },
  aboutSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 8,
  },
  bioEditHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  bioEditHeaderBtnPressed: {
    opacity: 0.75,
  },
  bioEditHeaderBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.orange,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },

  petsEmptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  petsEmptyText: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  petGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },
  petCard: {
    width: "47%",
    flexGrow: 1,
    minWidth: "47%",
    maxWidth: "48%",
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  petCardPressed: {
    opacity: 0.9,
  },
  petCardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  petCardAvatarImg: {
    width: "100%",
    height: "100%",
  },
  petCardName: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  petCardBreed: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 2,
  },
  activeDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orange,
    borderWidth: 2,
    borderColor: Colors.white,
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

  forgotPasswordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  forgotPasswordText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
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
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  cardRowPressed: {
    backgroundColor: Colors.gray50,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.gray100,
    marginLeft: 56,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconTileAccount: {
    backgroundColor: Colors.orangeLight,
  },
  accountRowMid: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minWidth: 0,
  },
  accountLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    flexShrink: 0,
  },
  accountValue: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "right",
  },
  supportTitle: {
    flex: 1,
    fontFamily: Font.uiMedium,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  signOutCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 4,
    marginBottom: 24,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.coralLight,
    gap: 12,
  },
  signOutIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.signOutCoralIconBg,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.signOutCoral,
  },
});
