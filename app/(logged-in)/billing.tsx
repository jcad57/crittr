import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { profileQueryKey, useProfileQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { createBillingPortalSession } from "@/services/stripeSubscription";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BillingScreen() {
  const router = useRouter();
  const { push } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const { data: profile, isLoading: profileLoading } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);

  const [opening, setOpening] = useState(false);

  const openPortal = useCallback(async () => {
    setOpening(true);
    try {
      const url = await createBillingPortalSession();
      await WebBrowser.openBrowserAsync(url);
      if (userId) {
        await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Could not open billing", msg);
    } finally {
      setOpening(false);
    }
  }, [queryClient, userId]);

  if (profileLoading && !profile) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          Billing
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!isPro ? (
          <>
            <Text style={styles.lead}>
              Billing management is available for Crittr Pro members. Upgrade to
              update the card on file, change your billing address, and manage
              invoices in Stripe&apos;s secure portal.
            </Text>
            <OrangeButton
              onPress={() =>
                push("/(logged-in)/upgrade?returnTo=billing" as Href)
              }
            >
              Upgrade to Crittr Pro
            </OrangeButton>
          </>
        ) : (
          <>
            <Text style={styles.lead}>
              Update your payment method, billing address, and view invoices in
              Stripe&apos;s secure customer portal.
            </Text>
            <View style={styles.card}>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons
                  name="credit-card-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.bulletText}>Card on file</Text>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.bulletText}>Billing address</Text>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.bulletText}>Invoices & receipt history</Text>
              </View>
            </View>

            <OrangeButton onPress={openPortal} loading={opening} disabled={opening}>
              Manage billing
            </OrangeButton>

            <Text style={styles.footnote}>
              You will leave the app briefly. When you are done, you will return
              to Crittr automatically.
            </Text>
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
    alignItems: "center",
    justifyContent: "center",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: { width: 28 },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: 16,
    gap: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bulletText: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  footnote: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray500,
    marginTop: 4,
  },
});
