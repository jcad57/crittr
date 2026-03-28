import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

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
};

export default function PetProfileHero({
  name,
  subline,
  imageUrl,
  tags,
}: PetProfileHeroProps) {
  const uri = imageUrl?.trim() || null;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.avatarImg}
              contentFit="cover"
            />
          ) : (
            <Text style={styles.avatarEmoji}>🐾</Text>
          )}
        </View>
        <View style={styles.textCol}>
          <Text style={styles.name}>{name}</Text>
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
  avatarWrap: {
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
  name: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.white,
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
