import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Pet } from "@/types/database";
import {
  buildPetListTags,
  formatPetListSubline,
  petListPreviewStats,
} from "@/utils/petListHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type PetFeatureVariant = "orange" | "dark";

type PetFeatureCardProps = {
  pet: Pet;
  variant: PetFeatureVariant;
};

const RADIUS = 28;

export default function PetFeatureCard({ pet, variant }: PetFeatureCardProps) {
  const router = useRouter();
  const isOrange = variant === "orange";
  const bg = isOrange ? Colors.orange : Colors.profileHeroDark;
  const subline = formatPetListSubline(pet);
  const tags = buildPetListTags(pet);
  const stats = petListPreviewStats(pet);

  const statStripBg = isOrange ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.08)";
  const tagBg = isOrange ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.12)";
  const ctaSecondaryBg = isOrange
    ? "rgba(0,0,0,0.28)"
    : "rgba(255,255,255,0.16)";

  const viewProfileText = isOrange ? Colors.orange : Colors.black;
  const avatarUri = pet.avatar_url?.trim() || null;

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {pet.name}
          </Text>
          <Text style={styles.subline} numberOfLines={2}>
            {subline}
          </Text>
        </View>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <MaterialCommunityIcons
              name="paw"
              size={36}
              color={isOrange ? Colors.white : Colors.orange}
            />
          )}
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Pressable
          style={[styles.ctaPrimary, { backgroundColor: Colors.white }]}
          onPress={() => router.push(`/(logged-in)/pet/${pet.id}`)}
        >
          <Text style={[styles.ctaPrimaryText, { color: viewProfileText }]}>
            View profile
          </Text>
        </Pressable>
        <Pressable
          style={[styles.ctaSecondary, { backgroundColor: ctaSecondaryBg }]}
          onPress={() => router.push("/(logged-in)/activity")}
        >
          <Text style={styles.ctaSecondaryText}>Log activity</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StatCell({
  value,
  label,
  isWeight,
}: {
  value: string;
  label: string;
  isWeight?: boolean;
}) {
  return (
    <View style={styles.statCell}>
      <Text
        style={[styles.statValue, isWeight && styles.statValueWeight]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subline: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    marginTop: 6,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  tagText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    color: Colors.white,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarRingOrange: {},
  avatarImage: {
    width: 72,
    height: 72,
  },
  statStrip: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 16,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  statValue: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  statValueWeight: {
    fontSize: 18,
  },
  statLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
    textAlign: "center",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 4,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  ctaPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPrimaryText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
  },
  ctaSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondaryText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.white,
  },
});
