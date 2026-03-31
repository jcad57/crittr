import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useDeletePetMutation,
  usePetDetailsQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DeletePetScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);
  const deleteMut = useDeletePetMutation(petId ?? "");

  const confirmDelete = useCallback(() => {
    if (!details?.name) return;
    Alert.alert(
      `Delete ${details.name} permanently?`,
      "This cannot be undone. All profile data for this pet will be removed from the app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteMut.mutateAsync();
                router.replace("/(logged-in)/pets");
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                Alert.alert("Could not delete", msg);
              }
            })();
          },
        },
      ],
    );
  }, [details?.name, deleteMut, router]);

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
          Delete pet
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
        <Text style={styles.lead}>
          Permanently deleting removes {details.name} from My pets and deletes
          their profile and related records from our database. Use this only if
          you want every trace of this pet removed from the app.
        </Text>
        <Text style={styles.bullet}>
          If your pet passed away and you want to keep their profile for
          remembrance, use Memorialize instead (from My pets).
        </Text>

        <Pressable
          style={[styles.deleteBtn, deleteMut.isPending && styles.deleteBtnDisabled]}
          onPress={confirmDelete}
          disabled={deleteMut.isPending}
        >
          <Text style={styles.deleteBtnText}>
            {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
          </Text>
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
    marginBottom: 28,
  },
  deleteBtn: {
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnDisabled: {
    opacity: 0.65,
  },
  deleteBtnText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.white,
  },
});
