import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { usePetStore } from "@/stores/petStore";
import type { Pet } from "@/types/database";
import { getPetListSublineParts } from "@/utils/petListHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  Pressable,
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
};

const RADIUS = 28;

/** Below this width, breed/sex stay on line 1 and age moves to line 2. */
const SUBLINE_STACK_WIDTH = 400;

export default function PetFeatureCard({ pet, variant }: PetFeatureCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const stackSubline = windowWidth < SUBLINE_STACK_WIDTH;
  const { primary: sublinePrimary, age: sublineAge } =
    getPetListSublineParts(pet);
  const router = useRouter();
  const setActivePet = usePetStore((s) => s.setActivePet);
  const isMemorial = variant === "memorial";
  const isOrange = variant === "orange";
  const bg = isMemorial
    ? Colors.memorialLavender
    : isOrange
      ? Colors.orange
      : Colors.profileHeroDark;
  const logBg = isOrange ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.16)";
  const deleteBg = isMemorial
    ? "rgba(110, 75, 105, 0.45)"
    : isOrange
      ? "rgba(90, 25, 25, 0.5)"
      : "rgba(180, 55, 55, 0.55)";
  const memorialCtaBg = isMemorial
    ? "rgba(255,255,255,0.2)"
    : isOrange
      ? "rgba(255,255,255,0.95)"
      : "rgba(255,255,255,0.14)";

  const memorialCtaText = isMemorial
    ? Colors.white
    : isOrange
      ? Colors.orange
      : Colors.white;

  const avatarUri = pet.avatar_url?.trim() || null;
  const canLogActivity = isPetActiveForDashboard(pet);

  const goProfile = () => router.push(`/(logged-in)/pet/${pet.id}`);
  const goDelete = () => router.push(`/(logged-in)/pet/${pet.id}/delete-pet`);
  const goMemorial = () =>
    router.push(`/(logged-in)/pet/${pet.id}/memorialize-pet`);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: bg }]}
      onPress={goProfile}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Open ${pet.name} profile`}
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
        </View>
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
      </View>

      <View style={styles.ctaRow}>
        {canLogActivity ? (
          <Pressable
            style={[styles.ctaBtn, { backgroundColor: logBg }]}
            onPress={() => {
              setActivePet(pet.id);
              router.push("/(logged-in)/add-activity");
            }}
            accessibilityRole="button"
            accessibilityLabel={`Log activity for ${pet.name}`}
          >
            <Text style={styles.ctaBtnText}>Log activity</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: deleteBg }]}
          onPress={goDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${pet.name}`}
        >
          <Text style={styles.ctaBtnText}>Delete</Text>
        </Pressable>
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: memorialCtaBg }]}
          onPress={goMemorial}
          accessibilityRole="button"
          accessibilityLabel={
            canLogActivity
              ? `Memorialize ${pet.name}`
              : `Restore ${pet.name} to active`
          }
        >
          <Text style={[styles.ctaBtnText, { color: memorialCtaText }]}>
            {canLogActivity ? "Memorialize" : "Restore"}
          </Text>
        </Pressable>
      </View>
    </TouchableOpacity>
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
  ctaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  ctaBtn: {
    flexGrow: 1,
    flexBasis: "28%",
    minWidth: "28%",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontFamily: Font.uiBold,
    fontSize: 12,
    color: Colors.white,
    textAlign: "center",
  },
});
