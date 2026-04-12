import { Colors } from "@/constants/colors";
import {
  PRO_GRADIENT_END,
  PRO_GRADIENT_START,
  PRO_HERO_INNER_GRADIENT,
} from "@/constants/proHeroGoldGradient";
import { Font } from "@/constants/typography";
import {
  profileQueryKey,
  usePetsQuery,
  useProfileQuery,
} from "@/hooks/queries";
import { useDeviceTiltShared } from "@/hooks/useDeviceTiltShared";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { pickAvatarImage } from "@/lib/pickImage";
import { queryClient } from "@/lib/queryClient";
import { updateProfile, uploadAvatar } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { Pet, Profile } from "@/types/database";
import { formatPetTypeLabel } from "@/utils/petDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const HERO_RADIUS = 24;
/** Extra size so translating the gradient reveals shifting shine inside the clip. */
const INNER_GRADIENT_OVERSCAN = 0.42;
const HERO_BORDER = 3;

/** Rotating border ring — metallic sweep (dark gold → bright → dark). */
const PRO_SHINE_BORDER_COLORS = [
  "#5C4008",
  "#8B6914",
  "#C9A012",
  "#FFF8DC",
  "#FFE566",
  "#FFF8DC",
  "#C9A012",
  "#8B6914",
  "#5C4008",
] as const;
const PRO_SHINE_LOCATIONS = [
  0, 0.12, 0.28, 0.45, 0.52, 0.6, 0.75, 0.88, 1,
] as const;

const proHeroStyles = StyleSheet.create({
  heroProWrapper: {
    marginBottom: 22,
    position: "relative",
  },
  heroCardProBorder: {
    borderRadius: HERO_RADIUS,
    position: "relative",
    shadowColor: "#FF8F00",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 26,
    elevation: 10,
  },
  heroCardProRing: {
    overflow: "hidden",
  },
  heroProShineSpinner: {
    position: "absolute",
  },
  heroCardProInnerClip: {
    margin: HERO_BORDER,
    borderRadius: HERO_RADIUS - HERO_BORDER,
    overflow: "hidden",
    zIndex: 1,
    position: "relative",
  },
  /** Oversized gradient layer; parent clips — translate simulates moving shine. */
  heroCardProInnerGradientWrap: {
    position: "absolute",
    borderRadius: HERO_RADIUS - HERO_BORDER,
  },
  heroCardProInnerContent: {
    padding: 17,
    gap: 14,
    position: "relative",
    zIndex: 1,
  },
});

function ProHeroWithShine({ children }: { children: React.ReactNode }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const rotation = useSharedValue(0);
  const { tiltX, tiltY } = useDeviceTiltShared(Platform.OS !== "web");

  /** Native LinearGradient ignores animated start/end; shift the layer instead. */
  const innerGradientShiftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tiltX.value * 36 },
      { translateY: tiltY.value * 28 },
    ],
  }));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 10000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const spinSize = box.w > 0 && box.h > 0 ? Math.max(box.w, box.h) * 2.75 : 0;
  const spinLeft = box.w > 0 ? (box.w - spinSize) / 2 : 0;
  const spinTop = box.h > 0 ? (box.h - spinSize) / 2 : 0;

  return (
    <View style={proHeroStyles.heroProWrapper}>
      <View
        style={[proHeroStyles.heroCardProBorder, proHeroStyles.heroCardProRing]}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setBox({ w: width, h: height });
        }}
      >
        {spinSize > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              proHeroStyles.heroProShineSpinner,
              {
                width: spinSize,
                height: spinSize,
                left: spinLeft,
                top: spinTop,
              },
              spinStyle,
            ]}
          >
            <LinearGradient
              colors={[...PRO_SHINE_BORDER_COLORS]}
              locations={[...PRO_SHINE_LOCATIONS]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        ) : null}
        <View style={proHeroStyles.heroCardProInnerClip}>
          <Animated.View
            pointerEvents="none"
            style={[
              proHeroStyles.heroCardProInnerGradientWrap,
              {
                left: `${-INNER_GRADIENT_OVERSCAN * 50}%`,
                top: `${-INNER_GRADIENT_OVERSCAN * 50}%`,
                width: `${100 + INNER_GRADIENT_OVERSCAN * 100}%`,
                height: `${100 + INNER_GRADIENT_OVERSCAN * 100}%`,
              },
              innerGradientShiftStyle,
            ]}
          >
            <LinearGradient
              colors={
                PRO_HERO_INNER_GRADIENT.colors as [string, string, ...string[]]
              }
              locations={
                PRO_HERO_INNER_GRADIENT.locations as [
                  number,
                  number,
                  ...number[],
                ]
              }
              start={PRO_GRADIENT_START}
              end={PRO_GRADIENT_END}
              style={StyleSheet.absoluteFillObject}
              dither
            />
          </Animated.View>
          <View style={proHeroStyles.heroCardProInnerContent}>{children}</View>
        </View>
      </View>
    </View>
  );
}

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

  const handleSignOut = async () => {
    await signOut();
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

  const openSettings = useCallback(() => {
    push("/(logged-in)/settings");
  }, [push]);

  const openPushNotifications = useCallback(() => {
    push("/(logged-in)/manage-notifications");
  }, [push]);

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
          onPress={openSettings}
        >
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={Colors.textPrimary}
          />
        </Pressable>
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
        {/* ── Hero ───────────────────────────────────────── */}
        {isPro ? (
          <ProHeroWithShine>
            <View style={styles.proMemberPillRow}>
              <View style={styles.proMemberPill}>
                <MaterialCommunityIcons
                  name="crown-outline"
                  size={15}
                  color={Colors.black}
                />
                <Text style={styles.proMemberPillText}>Crittr Pro Member</Text>
              </View>
            </View>
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
                <Text style={[styles.heroName, styles.heroNamePro]}>
                  {titleName}
                </Text>
                <Text style={[styles.heroEmail, styles.heroEmailPro]}>
                  {email || "—"}
                </Text>
                {memberLine ? (
                  <Text style={[styles.heroMember, styles.heroMemberPro]}>
                    {memberLine}
                  </Text>
                ) : null}
              </View>
            </View>
          </ProHeroWithShine>
        ) : (
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
        )}

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

        {/* ── Settings ────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Settings</Text>
        </View>
        <View style={styles.whiteCard}>
          <SupportRow
            icon="cog-outline"
            title="App settings"
            iconBg={Colors.orangeLight}
            iconColor={Colors.orange}
            onPress={openSettings}
          />
          <View style={styles.rowDivider} />
          <SupportRow
            icon="bell-outline"
            title="Push notifications"
            iconBg={Colors.mintLight}
            iconColor={Colors.successDark}
            onPress={openPushNotifications}
          />
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
        <Pressable
          style={({ pressed }) => [
            styles.signOutCard,
            pressed && { opacity: 0.65 },
          ]}
          onPress={handleSignOut}
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
        </Pressable>
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
  proMemberPillRow: {
    alignItems: "center",
  },
  proMemberPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "hsla(46, 92.30%, 64.50%, 0.25)",
    borderWidth: 1,
    borderColor: "hsla(46, 92.30%, 64.50%, 0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  proMemberPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
    color: Colors.black,
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
  heroNamePro: {
    color: "#2a2210",
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 1,
  },
  heroEmail: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  heroEmailPro: {
    color: "rgba(42,34,16,0.78)",
  },
  heroMember: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  heroMemberPro: {
    color: "rgba(58,48,28,0.65)",
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
