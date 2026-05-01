import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { petDetailsQueryKey, usePetDetailsQuery } from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import { updatePetMicrochip } from "@/services/pets";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PetMicrochipScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { replace, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const queryClient = useQueryClient();

  const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);

  const { data: details, isLoading } = usePetDetailsQuery(petId);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");

  const [number, setNumber] = useState("");
  const [hasMicrochip, setHasMicrochip] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!details) return;
    setNumber(details.microchip_number?.trim() ?? "");
    const chipped =
      details.is_microchipped === true ||
      (details.is_microchipped !== false &&
        Boolean(details.microchip_number?.trim()));
    setHasMicrochip(chipped);
  }, [details]);

  const onSave = useCallback(async () => {
    if (!petId) return;
    setSaving(true);
    try {
      if (!hasMicrochip) {
        await updatePetMicrochip(petId, {
          is_microchipped: false,
          microchip_number: null,
        });
      } else {
        const trimmed = number.trim();
        await updatePetMicrochip(petId, {
          is_microchipped: true,
          microchip_number: trimmed || null,
        });
      }
      await queryClient.invalidateQueries({
        queryKey: petDetailsQueryKey(petId),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [petId, hasMicrochip, number, queryClient, router]);

  if (isLoading || !details) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === false) {
    const chipped =
      details.is_microchipped === true ||
      (details.is_microchipped !== false &&
        Boolean(details.microchip_number?.trim()));
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <View style={styles.navSideLeft}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.navBack}>&lt; Back</Text>
            </Pressable>
          </View>
          <Text style={styles.navTitle} numberOfLines={1}>
            Microchip
          </Text>
          <View style={styles.navSideRight}>
            <PetNavAvatar
              displayPet={details}
              accessibilityLabelPrefix="Microchip for"
              onAfterSwitchPet={onPetSwitch}
            />
          </View>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow
            label="Microchipped"
            value={chipped ? "Yes" : "No"}
          />
          {chipped ? (
            <ReadOnlyFieldRow
              label="Microchip number"
              value={details.microchip_number?.trim() || "—"}
            />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Microchip
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Microchip for"
            onAfterSwitchPet={onPetSwitch}
          />
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          If {details.name} is microchipped, you can add the ID number here.
        </Text>

        <View style={styles.toggleCard}>
          <Text style={styles.toggleLabel}>
            {details.name} has a microchip
          </Text>
          <Switch
            value={hasMicrochip}
            onValueChange={setHasMicrochip}
            trackColor={{ false: Colors.gray300, true: Colors.orangeLight }}
            thumbColor={hasMicrochip ? Colors.orange : Colors.gray400}
            ios_backgroundColor={Colors.gray300}
            accessibilityLabel="Pet has a microchip"
          />
        </View>

        {hasMicrochip ? (
          <>
            <Text style={styles.label}>Microchip number</Text>
            <TextInput
              style={styles.input}
              value={number}
              onChangeText={setNumber}
              placeholder="e.g. 985112004567891"
              placeholderTextColor={Colors.gray400}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
            />
          </>
        ) : null}
      </KeyboardAwareScrollView>

      <View
        style={[
          styles.saveFooter,
          { paddingBottom: Math.max(scrollInsetBottom, 12) },
        ]}
      >
        <OrangeButton
          onPress={onSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
        >
          Save
        </OrangeButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  saveFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
    backgroundColor: Colors.cream,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  toggleLabel: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  saveBtn: {
    marginTop: 0,
  },
});
