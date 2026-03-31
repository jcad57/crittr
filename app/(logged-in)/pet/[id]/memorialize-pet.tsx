import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useMemorializePetMutation,
  usePetDetailsQuery,
  useUnmemorializePetMutation,
} from "@/hooks/queries";
import { isPetActiveForDashboard } from "@/lib/petParticipation";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MemorializePetScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const memorializeMut = useMemorializePetMutation(petId ?? "");
  const unmemorializeMut = useUnmemorializePetMutation(petId ?? "");

  const isLiving = details ? isPetActiveForDashboard(details) : false;

  const confirmMemorialize = useCallback(() => {
    if (!details?.name) return;
    Alert.alert(
      `Memorialize ${details.name}?`,
      "They will stay in My pets and you can still view their profile. They will no longer appear on the dashboard or when logging activities.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Memorialize",
          onPress: () => {
            void (async () => {
              try {
                await memorializeMut.mutateAsync();
                router.back();
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                Alert.alert("Could not memorialize", msg);
              }
            })();
          },
        },
      ],
    );
  }, [details?.name, memorializeMut, router]);

  const confirmRestore = useCallback(() => {
    if (!details?.name) return;
    Alert.alert(
      `Restore ${details.name}?`,
      "They will appear again on the dashboard and in activity flows like any other companion.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: () => {
            void (async () => {
              try {
                await unmemorializeMut.mutateAsync();
                router.back();
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                Alert.alert("Could not restore", msg);
              }
            })();
          },
        },
      ],
    );
  }, [details?.name, unmemorializeMut, router]);

  const busy = memorializeMut.isPending || unmemorializeMut.isPending;

  if (isLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
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
          {isLiving ? "Memorialize" : "Restore pet"}
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLiving ? (
          <>
            <Text style={styles.lead}>
              Memorializing is for companions who have passed away. {details.name}{" "}
              will remain in My pets so you can open their profile anytime, with a
              gentle visual style that reflects remembrance.
            </Text>
            <Text style={styles.bullet}>
              They will not show on the home dashboard pet switcher or in flows
              where you pick a pet to log activity or vaccinations.
            </Text>
            <OrangeButton
              onPress={confirmMemorialize}
              disabled={busy}
              style={styles.cta}
            >
              {memorializeMut.isPending ? "Memorializing…" : "Memorialize pet"}
            </OrangeButton>
          </>
        ) : (
          <>
            <Text style={styles.lead}>
              {details.name} is currently memorialized. You can restore them to
              your active companions if you marked them by mistake or your
              situation changed.
            </Text>
            <Text style={styles.bullet}>
              After restoring, they will appear on the dashboard and in activity
              selection again.
            </Text>
            <OrangeButton
              onPress={confirmRestore}
              disabled={busy}
              style={styles.cta}
            >
              {unmemorializeMut.isPending ? "Restoring…" : "Restore to active"}
            </OrangeButton>
          </>
        )}
      </ScrollView>
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
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  bullet: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  cta: {
    marginTop: 8,
  },
});
