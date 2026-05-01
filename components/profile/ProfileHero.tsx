import {
  type ProBannerThemeId,
  resolveProBannerTheme,
} from "@/constants/proBannerThemes";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ProHeroWithShine from "./ProHeroWithShine";

const HERO_RADIUS = 24;

type Props = {
  isPro: boolean;
  proBannerThemeId?: ProBannerThemeId;
  onProBannerPress?: () => void;
  titleName: string;
  email: string;
  memberLine: string | null;
  initials: string;
  avatarUrl: string | null | undefined;
  avatarUploading: boolean;
  onAvatarPress: () => void;
  /** Wide layouts (e.g. tablet): center avatar + identity text as a block. */
  centerIdentitySection?: boolean;
};

export default function ProfileHero({
  isPro,
  proBannerThemeId = "slate",
  onProBannerPress,
  titleName,
  email,
  memberLine,
  initials,
  avatarUrl,
  avatarUploading,
  onAvatarPress,
  centerIdentitySection = false,
}: Props) {
  const bannerTheme = resolveProBannerTheme(proBannerThemeId);
  const avatarBlock = (
    <Pressable
      onPress={onAvatarPress}
      disabled={avatarUploading}
      style={({ pressed }) => [
        styles.heroAvatarOuter,
        pressed && styles.heroAvatarPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
    >
      <View style={styles.heroAvatarClip}>
        {avatarUrl?.trim() ? (
          <Image
            source={{ uri: avatarUrl }}
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
  );

  const textCol = (
    <View
      style={
        centerIdentitySection
          ? styles.heroTextColTabletCentered
          : styles.heroTextCol
      }
    >
      <Text
        style={[
          styles.heroName,
          isPro ? styles.heroNamePro : undefined,
          centerIdentitySection && styles.heroTextCenter,
        ]}
      >
        {titleName}
      </Text>
      <Text
        style={[
          styles.heroEmail,
          isPro ? styles.heroEmailPro : undefined,
          centerIdentitySection && styles.heroTextCenter,
        ]}
      >
        {email || "—"}
      </Text>
      {memberLine ? (
        <Text
          style={[
            styles.heroMember,
            isPro ? styles.heroMemberPro : undefined,
            centerIdentitySection && styles.heroTextCenter,
          ]}
        >
          {memberLine}
        </Text>
      ) : null}
    </View>
  );

  const heroTopRowStyle = [
    styles.heroTopRow,
    centerIdentitySection && styles.heroTopRowCentered,
  ];
  if (isPro) {
    return (
      <ProHeroWithShine
        themeId={proBannerThemeId}
        onBannerPress={onProBannerPress}
      >
        <View style={styles.proMemberPillRow}>
          <View
            style={[
              styles.proMemberPill,
              {
                backgroundColor: bannerTheme.memberPillBackground,
                borderColor: bannerTheme.memberPillBorder,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="crown-outline"
              size={15}
              color={bannerTheme.crownIconColor}
            />
            <Text
              style={[
                styles.proMemberPillText,
                { color: bannerTheme.memberPillText },
              ]}
            >
              Crittr Pro Member
            </Text>
          </View>
        </View>
        <View style={heroTopRowStyle}>
          {avatarBlock}
          {textCol}
        </View>
      </ProHeroWithShine>
    );
  }

  return (
    <View style={styles.heroCard}>
      <View style={heroTopRowStyle}>
        {avatarBlock}
        {textCol}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  proMemberPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  heroTopRowCentered: {
    justifyContent: "center",
    width: "100%",
  },
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
  heroTextColTabletCentered: {
    gap: 4,
    flexGrow: 0,
    flexShrink: 1,
    alignItems: "center",
    maxWidth: "100%",
  },
  heroTextCenter: {
    textAlign: "center",
  },
  heroName: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.white,
  },
  heroNamePro: {
    color: "#f8fafc",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroEmail: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  heroEmailPro: {
    color: "rgba(248,250,252,0.82)",
  },
  heroMember: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  heroMemberPro: {
    color: "rgba(248,250,252,0.58)",
  },
});
