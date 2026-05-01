import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import PetCatLitterSection from "@/components/onboarding/petInfo/PetCatLitterSection";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  usePetDetailsQuery,
  useUpdatePetLitterMaintenanceMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import type { LitterCleaningPeriod } from "@/types/database";
import { getErrorMessage } from "@/utils/errorMessage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LitterMaintenanceScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");
  const updateMut = useUpdatePetLitterMaintenanceMutation(petId ?? "");

  const [period, setPeriod] = useState<LitterCleaningPeriod | "">("");
  const [count, setCount] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!details?.id || details.pet_type !== "cat") return;
    const p = details.litter_cleaning_period;
    if (p === "day" || p === "week" || p === "month") {
      setPeriod(p);
    } else {
      setPeriod("");
    }
    const n = details.litter_cleanings_per_period;
    setCount(n != null && n > 0 ? String(n) : "");
  }, [details?.id, details?.pet_type, details?.litter_cleaning_period, details?.litter_cleanings_per_period]);

  const handleSave = useCallback(async () => {
    if (!petId || details?.pet_type !== "cat") return;
    setAttempted(true);
    const periodOk =
      period === "day" || period === "week" || period === "month";
    const ci = parseInt(count.trim(), 10);
    const countOk = Number.isFinite(ci) && ci >= 1;
    if (!periodOk || !countOk) return;

    try {
      await updateMut.mutateAsync({
        litter_cleaning_period: period,
        litter_cleanings_per_period: ci,
      });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't save", getErrorMessage(e) || "Please try again.");
    }
  }, [petId, details?.pet_type, period, count, updateMut, router]);

  const periodError = attempted && period !== "day" && period !== "week" && period !== "month";
  const countError =
    attempted &&
    (!count.trim() ||
      !Number.isFinite(parseInt(count.trim(), 10)) ||
      parseInt(count.trim(), 10) < 1);

  if (isLoading || !details) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (details.pet_type !== "cat") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            Litter box
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
        >
          <Text style={styles.lead}>
            Litter tracking is only available for cats.
          </Text>
        </ScrollView>
      </View>
    );
  }

  if (canEditProfile === undefined) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === false) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            Litter box
          </Text>
          <View style={styles.navSpacer} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.body,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
        >
          <CoCareReadOnlyNotice />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.navBack}>&lt; Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          Litter box
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Set how often you want to track litter box cleanings. Progress appears
          under Maintenance on the dashboard.
        </Text>

        <PetCatLitterSection
          litterCleaningPeriod={period}
          litterCleaningsPerPeriod={count}
          onPeriodChange={setPeriod}
          onCleaningsChange={setCount}
          periodError={periodError}
          cleaningsError={countError}
        />

        <OrangeButton
          onPress={() => void handleSave()}
          loading={updateMut.isPending}
          style={styles.saveBtn}
        >
          Save changes
        </OrangeButton>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
    minWidth: 72,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { minWidth: 72 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  saveBtn: {
    marginTop: 8,
  },
});
