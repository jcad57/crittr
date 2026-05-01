import { Colors } from "@/constants/colors";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useProfileQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useStripeBillingPortal } from "@/hooks/useStripeBillingPortal";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BILLING_ICON = require("@/assets/icons/billing-icon.png");

export default function SettingsScreen() {
  const router = useRouter();
  const { push } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { data: profile } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [accountDeletionPending, setAccountDeletionPending] = useState(false);
  const { openBillingPortal, opening: billingPortalOpening } =
    useStripeBillingPortal();

  const runAccountDeletion = useCallback(async () => {
    setAccountDeletionPending(true);
    try {
      await deleteAccount();
      router.replace("/(auth)/welcome" as Href);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Could not delete account", msg);
    } finally {
      setAccountDeletionPending(false);
    }
  }, [deleteAccount, router]);

  const onDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your Crittr profile, pets, activity and health history, and any co-care access to pets you own. Co-carers keep their accounts but lose access to your pets and shared data only. Stored files (avatars, documents) are removed. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete account permanently?",
              "If you have Crittr Pro, your subscription will be cancelled. All personal data will be erased from our servers.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete my account",
                  style: "destructive",
                  onPress: () => {
                    void runAccountDeletion();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [runAccountDeletion]);

  const openNotifications = () => {
    push("/(logged-in)/manage-notifications" as Href);
  };

  const openSubscriptions = () => {
    if (isPro) {
      push("/(logged-in)/subscriptions" as Href);
    } else {
      push("/(logged-in)/upgrade?returnTo=subscriptions" as Href);
    }
  };

  const openBilling = useCallback(() => {
    if (!isPro) {
      push("/(logged-in)/upgrade?returnTo=settings" as Href);
      return;
    }
    void openBillingPortal();
  }, [isPro, push, openBillingPortal]);

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
          Settings
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
        <Text style={styles.sectionLabel}>Notifications</Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={openNotifications}
        >
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={Colors.orange}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Push notifications</Text>
            <Text style={styles.rowSub}>
              Meals, meds, vet visits, co-care activity nudges, and system
              permission
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>

        <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
          Subscription & billing
        </Text>
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={openSubscriptions}
        >
          <View style={styles.rowIconWrap}>
            <MaterialCommunityIcons
              name="crown"
              size={22}
              color={Colors.orange}
            />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Subscriptions</Text>
            <Text style={styles.rowSub}>
              {isPro
                ? "Crittr Pro plan, renewal, and cancellation"
                : "Upgrade to Crittr Pro"}
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.row,
            styles.rowSpaced,
            pressed && styles.rowPressed,
            billingPortalOpening && styles.rowDisabled,
          ]}
          onPress={openBilling}
          disabled={billingPortalOpening}
        >
          <View style={styles.rowIconWrap}>
            {billingPortalOpening ? (
              <ActivityIndicator size="small" color={Colors.orange} />
            ) : (
              <Image
                source={BILLING_ICON}
                style={styles.billingIconImg}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Billing</Text>
            <Text style={styles.rowSub}>
              Payment method and billing address
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={Colors.gray400}
          />
        </Pressable>

        <Text style={[styles.sectionLabel, styles.sectionSpaced]}>
          Account
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.rowDanger,
            pressed && styles.rowPressed,
            accountDeletionPending && styles.rowDisabled,
          ]}
          onPress={onDeleteAccount}
          disabled={accountDeletionPending}
        >
          <View style={styles.rowIconWrapDanger}>
            {accountDeletionPending ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <MaterialCommunityIcons
                name="account-remove-outline"
                size={22}
                color={Colors.error}
              />
            )}
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitleDanger}>Delete account</Text>
            <Text style={styles.rowSub}>
              Remove your profile, pets, and data from Crittr
            </Text>
          </View>
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
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionSpaced: {
    marginTop: 28,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  rowPressed: { opacity: 0.92 },
  rowDisabled: { opacity: 0.65 },
  rowSpaced: { marginTop: 10 },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  billingIconImg: {
    width: 22,
    height: 22,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  rowDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  rowIconWrapDanger: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.errorLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitleDanger: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
});
