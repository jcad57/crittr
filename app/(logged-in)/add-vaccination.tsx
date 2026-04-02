import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetsQuery } from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import type { Pet } from "@/types/database";
import type { Href } from "expo-router";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Legacy entry from Health / deep links. Pet-specific add/edit lives at
 * `/(logged-in)/pet/[id]/vaccinations/[vaccinationId]`.
 */
export default function AddVaccinationRedirectScreen() {
  const insets = useSafeAreaInsets();
  const { petId: petIdParam } = useLocalSearchParams<{ petId?: string }>();
  const { data: petsData } = usePetsQuery();
  const pets: Pet[] = petsData ?? [];

  const petId = useMemo(() => {
    if (petIdParam && pets.some((p) => p.id === petIdParam)) return petIdParam;
    return pets[0]?.id ?? "";
  }, [petIdParam, pets]);

  if (pets.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.hint}>
          Add a pet before recording a vaccination.
        </Text>
      </View>
    );
  }

  if (!petId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.hint}>Could not find this pet. Go back and try again.</Text>
      </View>
    );
  }

  return <AddVaccinationWithPermission petId={petId} />;
}

function AddVaccinationWithPermission({ petId }: { petId: string }) {
  const insets = useSafeAreaInsets();
  const canManage = useCanPerformAction(petId, "can_manage_vaccinations");

  if (canManage === undefined) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canManage === false) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 24 }]}>
        <CoCareReadOnlyNotice />
        <Text style={styles.hint}>
          Adding vaccinations requires permission from the primary caretaker. Ask
          them to grant vaccination access in co-care settings if you should
          record shots for this pet.
        </Text>
      </View>
    );
  }

  return (
    <Redirect href={`/(logged-in)/pet/${petId}/vaccinations/new` as Href} />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});
