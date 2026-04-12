import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { Pet } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ProfileSectionHeader from "./ProfileSectionHeader";
import { petSubtitle } from "./profileHelpers";

type Props = {
  pets: Pet[];
  activePetId: string | null;
  onPetPress: (petId: string) => void;
};

export default function ProfilePetsSection({
  pets,
  activePetId,
  onPetPress,
}: Props) {
  return (
    <>
      <ProfileSectionHeader label="My pets" />
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
                onPress={() => onPetPress(pet.id)}
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
    </>
  );
}

const styles = StyleSheet.create({
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
});
