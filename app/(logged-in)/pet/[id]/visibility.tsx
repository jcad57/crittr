import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { usePetDetailsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import type { Href } from "expo-router";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);

  if (isLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const name = details.name?.trim() || "This pet";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Visibility
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Visibility for"
          />
        </View>
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
        <Text style={styles.lead}>
          Choose how {name} appears across Crittr. Active companions show on
          Dashboard and in flows where you pick a pet to log something.
          Memorializing keeps their profile in My pets with a gentle
          remembrance style, and they won&apos;t appear in those active
          pickers.
        </Text>

        <OrangeButton
          onPress={() =>
            router.push(`/(logged-in)/pet/${petId}/memorialize-pet` as Href)
          }
          style={styles.cta}
        >
          Memorialize or restore
        </OrangeButton>

        <Pressable
          style={styles.deleteLink}
          onPress={() =>
            router.push(`/(logged-in)/pet/${petId}/delete-pet` as Href)
          }
        >
          <Text style={styles.deleteLinkText}>Delete pet permanently…</Text>
        </Pressable>
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 24,
  },
  cta: {
    marginBottom: 20,
  },
  deleteLink: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  deleteLinkText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
});
