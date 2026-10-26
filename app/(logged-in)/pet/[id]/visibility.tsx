import ScreenHeader from "@/components/ui/ScreenHeader";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { usePetDetailsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import type { Href } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PetVisibilityScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { push, replace, router } = useNavigationCooldown();
  const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);

  if (isLoading || !details || !petId) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const name = details.name?.trim() || "This pet";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <ScreenHeader
        title="Visibility"
        onBack={() => router.back()}
        right={
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Visibility for"
            onAfterSwitchPet={onPetSwitch}
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Choose how {name} appears across Crittr. Memorializing keeps their
          profile in My pets with a gentle remembrance style, and they
          won&apos;t appear in those active pickers.
        </Text>
        <View style={styles.ctaContainer}>
          <OrangeButton
            onPress={() =>
              push(`/(logged-in)/pet/${petId}/memorialize-pet` as Href)
            }
            style={styles.cta}
          >
            Memorialize or restore
          </OrangeButton>

          <Pressable
            style={styles.deleteLink}
            onPress={() => push(`/(logged-in)/pet/${petId}/delete-pet` as Href)}
          >
            <Text style={styles.deleteLinkText}>Delete pet permanently…</Text>
          </Pressable>
        </View>
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
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    justifyContent: "space-between",
    flex: 1,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 24,
  },
  ctaContainer: {
    alignItems: "center",
  },
  cta: {
    marginBottom: 12,
  },
  deleteLink: {
    alignSelf: "flex-start",
    paddingTop: 8,
    alignItems: "center",
    width: "100%",
  },
  deleteLinkText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
});
