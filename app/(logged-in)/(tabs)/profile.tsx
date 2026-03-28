import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery, useProfileQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useAuthStore } from "@/stores/authStore";
import { usePetStore } from "@/stores/petStore";
import type { Pet, Profile } from "@/types/database";
import { formatPetTypeLabel } from "@/utils/petDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
  onPress?: () => void;
};

function AccountRow({ icon, label, value, onPress }: AccountRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.cardRow,
        pressed && styles.cardRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconTile, styles.iconTileAccount]}>
        <MaterialCommunityIcons name={icon} size={22} color={Colors.orange} />
      </View>
      <View style={styles.accountRowMid}>
        <Text style={styles.accountLabel}>{label}</Text>
        <Text style={styles.accountValue} numberOfLines={2}>
          {value.trim() || "—"}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={Colors.gray400}
      />
    </Pressable>
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
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const activePetId = usePetStore((s) => s.activePetId);

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
    router.replace("/(auth)/welcome");
  };

  const placeholder = () =>
    Alert.alert(
      "Coming soon",
      "This action will be available in a future update.",
    );

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
            <View style={styles.heroAvatar}>
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
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroName}>{titleName}</Text>
              <Text style={styles.heroEmail}>{email || "—"}</Text>
              {memberLine ? (
                <Text style={styles.heroMember}>{memberLine}</Text>
              ) : null}
            </View>
          </View>
          {/* <Pressable
            style={({ pressed }) => [
              styles.editPill,
              pressed && styles.editPillPressed,
            ]}
            onPress={placeholder}
          >
            <Text style={styles.editPillText}>Edit profile</Text>
          </Pressable> */}
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
                  onPress={() => router.push(`/(logged-in)/pet/${pet.id}`)}
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

        {profile?.bio?.trim() ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>About</Text>
            </View>
            <View style={styles.bioCard}>
              <Text style={styles.bioText}>{profile.bio.trim()}</Text>
            </View>
          </>
        ) : null}

        {/* ── Account ───────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Account</Text>
        </View>
        <View style={styles.whiteCard}>
          <AccountRow
            icon="phone-outline"
            label="Phone number"
            value={profile?.phone_number?.trim() ?? ""}
            onPress={placeholder}
          />
          <View style={styles.rowDivider} />
          <AccountRow
            icon="email-outline"
            label="Email"
            value={email}
            onPress={placeholder}
          />
          <View style={styles.rowDivider} />
          <AccountRow
            icon="map-marker-outline"
            label="Address"
            value={profile?.home_address?.trim() ?? ""}
            onPress={placeholder}
          />
          <View style={styles.rowDivider} />
          <AccountRow
            icon="lock-outline"
            label="Password"
            value="••••••••"
            onPress={placeholder}
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
            pressed && styles.signOutCardPressed,
          ]}
          onPress={handleSignOut}
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
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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
  editPill: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  editPillPressed: {
    opacity: 0.85,
  },
  editPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: "rgba(255,255,255,0.95)",
  },

  sectionHeader: {
    marginBottom: 10,
    marginTop: 8,
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
  signOutCardPressed: {
    opacity: 0.9,
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
