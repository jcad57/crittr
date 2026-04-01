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

export type PetHeroTag = {
  label: string;
  /** `false` = fact is true (green pill); `true` = not true / unknown (original translucent pill) */
  muted: boolean;
};

type PetProfileHeroProps = {
  name: string;
  /** e.g. "Golden Retriever · Female · 4 yrs" */
  subline: string;
  imageUrl?: string | null;
  tags: PetHeroTag[];
  /** When set, the avatar becomes tappable to change the photo. */
  onAvatarPress?: () => void;
  avatarUploading?: boolean;
  /** When set, shows a pencil next to the name to edit it. */
  onEditNamePress?: () => void;
};

export default function PetProfileHero({
  name,
  subline,
  imageUrl,
  tags,
  onAvatarPress,
  avatarUploading,
  onEditNamePress,
}: PetProfileHeroProps) {
  const uri = imageUrl?.trim() || null;

  const avatarCircle = (
    <View style={styles.avatarClip}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImg} contentFit="cover" />
      ) : (
        <Text style={styles.avatarEmoji}>🐾</Text>
      )}
      {avatarUploading ? (
        <View style={styles.avatarOverlay}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {onAvatarPress ? (
          <Pressable
            onPress={onAvatarPress}
            disabled={avatarUploading}
            style={({ pressed }) => [
              styles.avatarOuter,
              pressed && styles.avatarPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change pet photo"
          >
            {avatarCircle}
            {!avatarUploading ? (
              <View style={styles.pencilBadge} pointerEvents="none">
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={14}
                  color={Colors.orange}
                />
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.avatarOuter}>{avatarCircle}</View>
        )}
        <View style={styles.textCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
            {onEditNamePress ? (
              <Pressable
                onPress={onEditNamePress}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.nameEditHit,
                  pressed && styles.nameEditPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Edit pet name"
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={20}
                  color="rgba(255,255,255,0.95)"
                />
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.subline} numberOfLines={2}>
            {subline}
          </Text>
        </View>
      </View>
      <View style={styles.tagsRow}>
        {tags.map((t, i) => (
          <View
            key={`${t.label}-${i}`}
            style={[styles.tag, t.muted ? styles.tagSubtle : styles.tagActive]}
          >
            <Text style={styles.tagText} numberOfLines={1}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.orange,
    borderRadius: 20,
    padding: 18,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  /**
   * Larger than the 72px circle so the pencil badge can sit on the rim without
   * negative offsets (parent card uses overflow:hidden and would clip).
   */
  avatarOuter: {
    width: 80,
    height: 80,
    position: "relative",
  },
  /** Photo/emoji only — circular mask applied here (pencil is a sibling, not clipped). */
  avatarClip: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.95)",
  },
  avatarPressed: {
    opacity: 0.92,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  pencilBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: Colors.white,
    zIndex: 2,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarEmoji: {
    fontSize: 36,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.white,
  },
  nameEditHit: {
    marginTop: 2,
    padding: 4,
    borderRadius: 8,
  },
  nameEditPressed: {
    opacity: 0.85,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  subline: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.92)",
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
    marginTop: 10,
  },
  tag: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Original style for “not true” / unknown (translucent on orange) */
  tagSubtle: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  /** True / positive fact — dark teal-forest */
  tagActive: {
    backgroundColor: Colors.petHeroTagActive,
  },
  tagText: {
    fontFamily: Font.uiMedium,
    fontSize: 11,
    color: Colors.white,
    textAlign: "center",
  },
});
