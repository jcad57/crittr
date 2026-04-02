import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Pet, PetRole } from "@/types/database";
import { getPetListSublineParts } from "@/utils/petListHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export type PetFeatureVariant = "orange" | "dark" | "memorial";

type PetFeatureCardProps = {
  pet: Pet;
  variant: PetFeatureVariant;
  role?: PetRole;
};

const RADIUS = 28;

/** Below this width, breed/sex stay on line 1 and age moves to line 2. */
const SUBLINE_STACK_WIDTH = 400;

export default function PetFeatureCard({ pet, variant, role }: PetFeatureCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const stackSubline = windowWidth < SUBLINE_STACK_WIDTH;
  const { primary: sublinePrimary, age: sublineAge } =
    getPetListSublineParts(pet);
  const { push } = useNavigationCooldown();
  const isMemorial = variant === "memorial";
  const isOrange = variant === "orange";
  const bg = isMemorial
    ? Colors.memorialLavender
    : isOrange
      ? Colors.orange
      : Colors.profileHeroDark;

  const avatarUri = pet.avatar_url?.trim() || null;
  const chevronColor = isMemorial
    ? "rgba(255,255,255,0.75)"
    : "rgba(255,255,255,0.9)";

  const goProfile = () => push(`/(logged-in)/pet/${pet.id}`);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={goProfile}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}`}
      accessibilityHint="Opens profile"
    >
      <View style={styles.topRow}>
        <View style={styles.identity}>
          {isMemorial ? (
            <View style={styles.memorialBadge}>
              <MaterialCommunityIcons
                name="flower-outline"
                size={14}
                color={Colors.memorialGoldSoft}
              />
              <Text style={styles.memorialBadgeText}>In loving memory</Text>
            </View>
          ) : null}
          <Text
            style={[styles.name, isMemorial && styles.nameMemorial]}
            numberOfLines={1}
          >
            {pet.name}
          </Text>
          {stackSubline ? (
            <View>
              <Text
                style={[styles.subline, isMemorial && styles.sublineMemorial]}
                numberOfLines={2}
              >
                {sublinePrimary}
              </Text>
              <Text
                style={[
                  styles.subline,
                  styles.sublineAgeSecondLine,
                  isMemorial && styles.sublineMemorial,
                ]}
                numberOfLines={1}
              >
                {sublineAge}
              </Text>
            </View>
          ) : (
            <Text
              style={[styles.subline, isMemorial && styles.sublineMemorial]}
              numberOfLines={2}
            >
              {`${sublinePrimary} · ${sublineAge}`}
            </Text>
          )}
          {!isMemorial && role === "co_carer" ? (
            <View style={styles.coCarerBadge}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={14}
                color={Colors.lavenderDark}
              />
              <Text style={styles.coCarerBadgeText}>Co-carer</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.avatarChevron}>
          <View style={[styles.avatar, isMemorial && styles.avatarMemorial]}>
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
                color={
                  isMemorial
                    ? Colors.memorialGoldSoft
                    : isOrange
                      ? Colors.white
                      : Colors.orange
                }
              />
            )}
          </View>
          <View accessible={false}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={chevronColor}
              style={styles.chevron}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS,
    paddingHorizontal: 20,
    paddingVertical: 22,
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
  memorialBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  memorialBadgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: Colors.memorialGoldSoft,
  },
  coCarerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.lavenderLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.lavender,
    marginTop: 10,
  },
  coCarerBadgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    color: Colors.lavenderDark,
  },
  name: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  nameMemorial: {
    fontWeight: "600",
    color: "rgba(255,255,255,0.96)",
  },
  subline: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.82)",
    marginTop: 6,
    lineHeight: 14,
  },
  sublineMemorial: {
    color: Colors.memorialTextMuted,
  },
  sublineAgeSecondLine: {
    marginTop: 4,
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
  avatarMemorial: {
    borderColor: "rgba(201,184,150,0.45)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  avatarImage: {
    width: 72,
    height: 72,
  },
  avatarChevron: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  chevron: {
    marginLeft: 2,
  },
});
