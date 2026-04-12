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
  titleName: string;
  email: string;
  memberLine: string | null;
  initials: string;
  avatarUrl: string | null | undefined;
  avatarUploading: boolean;
  onAvatarPress: () => void;
};

export default function ProfileHero({
  isPro,
  titleName,
  email,
  memberLine,
  initials,
  avatarUrl,
  avatarUploading,
  onAvatarPress,
}: Props) {
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
    <View style={styles.heroTextCol}>
      <Text
        style={[styles.heroName, isPro ? styles.heroNamePro : undefined]}
      >
        {titleName}
      </Text>
      <Text
        style={[styles.heroEmail, isPro ? styles.heroEmailPro : undefined]}
      >
        {email || "—"}
      </Text>
      {memberLine ? (
        <Text
          style={[styles.heroMember, isPro ? styles.heroMemberPro : undefined]}
        >
          {memberLine}
        </Text>
      ) : null}
    </View>
  );

  if (isPro) {
    return (
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
          {avatarBlock}
          {textCol}
        </View>
      </ProHeroWithShine>
    );
  }

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTopRow}>
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
});
