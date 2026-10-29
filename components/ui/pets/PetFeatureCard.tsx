import {
  PET_TYPE_OPTIONS,
  petTypeMaterialIcon,
} from "@/constants/petTypeIcons";
import { useCoCarersForPetQuery } from "@/hooks/queries/useCoCareQuery";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import type { Pet, PetRole } from "@/types/database";
import {
  getPetAgeCompactYrs,
  getPetListBreedLabel,
} from "@/utils/petListHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type PetFeatureVariant = "orange" | "dark" | "memorial";
type Props = { pet: Pet; variant: PetFeatureVariant; role?: PetRole };

export default function PetFeatureCard({ pet, variant, role }: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { push } = useNavigationCooldown();
  const memorial = variant === "memorial";
  const { data: carers } = useCoCarersForPetQuery(
    role === "owner" && !memorial ? pet.id : null,
  );
  const count = carers
    ? new Set([pet.owner_id, ...carers.map((carer) => carer.user_id)]).size
    : null;
  const breed = getPetListBreedLabel(pet);
  const age = getPetAgeCompactYrs(pet);
  const species =
    PET_TYPE_OPTIONS.find((option) => option.id === pet.pet_type)?.label ??
    "Pet";
  const uri = pet.avatar_url?.trim();
  const background = memorial
    ? Colors.memorialLavender
    : variant === "orange"
      ? Colors.peach
      : Colors.lavenderLight;
  const ink = memorial
    ? Colors.memorialTextMuted
    : variant === "orange"
      ? Colors.peachDark
      : Colors.lavenderDark;
  const microchip =
    pet.is_microchipped === true
      ? "Microchipped"
      : pet.is_microchipped === false
        ? "Not microchipped"
        : "Microchip not set";
  const team =
    role === "owner" && count != null
      ? `${count} ${count === 1 ? "carer" : "carers"}`
      : role === "co_carer"
        ? "Shared care"
        : "Care team";

  return (
    <TouchableOpacity
      onPress={() => push(`/(logged-in)/pet/${pet.id}`)}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: background }]}
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${breed}, ${age}${memorial ? ", in loving memory" : `, ${microchip}, ${team}`}`}
      accessibilityHint="Opens profile"
    >
      <View style={styles.topRow}>
        <View style={styles.species}>
          <MaterialCommunityIcons
            name={petTypeMaterialIcon(pet.pet_type)}
            size={16}
            color={ink}
          />
          <Text style={[styles.speciesText, { color: ink }]}>{species}</Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={memorial ? Colors.memorialTextMuted : Colors.textPrimary}
        />
      </View>

      <View style={styles.identityRow}>
        <View style={styles.identity}>
          {memorial ? (
            <View style={styles.memorialBadge}>
              <MaterialCommunityIcons
                name="flower-outline"
                size={13}
                color={Colors.memorialGoldSoft}
              />
              <Text style={styles.memorialLabel}>In loving memory</Text>
            </View>
          ) : null}
          <Text
            style={[styles.name, memorial && styles.nameMemorial]}
            numberOfLines={2}
          >
            {pet.name}
          </Text>
          <Text style={[styles.meta, { color: ink }]}>
            {breed} · {age}
          </Text>
          {!memorial ? (
            <View style={styles.roleBadge}>
              <MaterialCommunityIcons
                name={
                  role === "co_carer"
                    ? "account-group-outline"
                    : "heart-outline"
                }
                size={14}
                color={Colors.textPrimary}
              />
              <Text style={styles.roleLabel}>
                {role === "co_carer" ? "Co-carer" : "Your companion"}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.avatar, memorial && styles.avatarMemorial]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <MaterialCommunityIcons
              name={petTypeMaterialIcon(pet.pet_type)}
              size={38}
              color={ink}
            />
          )}
        </View>
      </View>

      {!memorial ? (
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name={
                pet.is_microchipped === true
                  ? "shield-check-outline"
                  : "shield-outline"
              }
              size={18}
              color={ink}
            />
            <Text style={[styles.footerText, { color: ink }]}>{microchip}</Text>
          </View>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name="account-group-outline"
              size={18}
              color={ink}
            />
            <Text style={[styles.footerText, { color: ink }]}>{team}</Text>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  card: {
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },
  species: { flexDirection: "row", alignItems: "center", gap: 6 },
  speciesText: {
    fontFamily: Font.uiBold,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 21,
  },
  identity: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: Font.displayBold,
    fontSize: 34,
    lineHeight: 39,
    color: Colors.textPrimary,
    letterSpacing: -0.6,
  },
  nameMemorial: { color: Colors.white },
  meta: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "rgba(255,253,248,0.65)",
    marginTop: 10,
  },
  roleLabel: {
    fontFamily: Font.uiBold,
    fontSize: 10,
    color: Colors.textPrimary,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: Colors.warmWhite,
    backgroundColor: Colors.warmWhite,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  photo: { width: "100%", height: "100%" },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(16,23,25,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingVertical: 14,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  footerText: { fontFamily: Font.uiBold, fontSize: 11, flexShrink: 1 },
  memorialBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 8,
  },
  memorialLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 10,
    color: Colors.memorialGoldSoft,
  },
  avatarMemorial: {
    borderColor: Colors.memorialGoldSoft,
    backgroundColor: Colors.memorialLavenderDeep,
  },
}));
