import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  coCarersForPetKey,
  sentInvitesForPetKey,
  useCoCarersForPetQuery,
  usePetDetailsQuery,
  useRevokeInviteMutation,
  useSentInvitesForPetQuery,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { queryClient } from "@/lib/queryClient";
import { type CoCarerWithProfile } from "@/services/coCare";
import type { CoCarerInvite } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PetInviteCareScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { push, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const {
    data: details,
    isLoading: detailsLoading,
    refetch: refetchDetails,
  } = usePetDetailsQuery(petId ?? null);
  const {
    data: coCarers = [],
    isLoading: carersLoading,
    refetch: refetchCoCarers,
  } = useCoCarersForPetQuery(petId);
  const { data: sentInvites = [], refetch: refetchSentInvites } =
    useSentInvitesForPetQuery(petId);
  const [refreshing, setRefreshing] = useState(false);
  const revokeInvite = useRevokeInviteMutation(petId ?? "");

  /** True pending only; hide stale rows where status is still “pending” but they already co-care. */
  const pendingInvites = useMemo(() => {
    const coCarerIds = new Set(coCarers.map((c) => c.user_id));
    return sentInvites.filter((i) => {
      if (i.status !== "pending") return false;
      if (i.invited_user_id && coCarerIds.has(i.invited_user_id)) return false;
      return true;
    });
  }, [sentInvites, coCarers]);

  useFocusEffect(
    useCallback(() => {
      if (!petId) return;
      void queryClient.invalidateQueries({ queryKey: sentInvitesForPetKey(petId) });
      void queryClient.invalidateQueries({ queryKey: coCarersForPetKey(petId) });
    }, [petId]),
  );

  const onRefresh = useCallback(async () => {
    if (!petId) return;
    setRefreshing(true);
    try {
      await Promise.all([
        refetchDetails(),
        refetchCoCarers(),
        refetchSentInvites(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [petId, refetchDetails, refetchCoCarers, refetchSentInvites]);

  const onRevoke = useCallback(
    (inviteId: string) => {
      Alert.alert("Revoke invite?", "This invite will be cancelled.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () => revokeInvite.mutate(inviteId),
        },
      ]);
    },
    [revokeInvite],
  );

  if (detailsLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const name = details.name?.trim() || "your pet";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* Nav */}
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Co-carers
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Co-carers for"
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={Colors.orange}
            colors={[Colors.orange]}
          />
        }
      >
        {/* Invite section */}
        <Text style={styles.sectionLabel}>INVITE SOMEONE</Text>
        <Text style={styles.lead}>
          Invite someone by email to help care for {name}. You choose their access
          before the invite is sent.
        </Text>

        <OrangeButton
          onPress={() =>
            push(`/(logged-in)/pet/${petId}/invite-co-carer`)
          }
          style={styles.sendBtn}
        >
          Invite someone to care for {name}
        </OrangeButton>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, styles.sectionGap]}>
              PENDING INVITES
            </Text>
            {pendingInvites.map((inv: CoCarerInvite) => (
              <View key={inv.id} style={styles.row}>
                <View style={styles.rowIcon}>
                  <MaterialCommunityIcons
                    name="email-outline"
                    size={20}
                    color={Colors.gray500}
                  />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{inv.email}</Text>
                  <Text style={styles.rowSub}>Pending</Text>
                </View>
                <Pressable
                  onPress={() => onRevoke(inv.id)}
                  hitSlop={8}
                  style={styles.revokeBtn}
                >
                  <Text style={styles.revokeText}>Revoke</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {/* Current co-carers */}
        {carersLoading ? (
          <ActivityIndicator
            color={Colors.orange}
            style={{ marginTop: 24 }}
          />
        ) : coCarers.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, styles.sectionGap]}>
              CO-CARERS
            </Text>
            {coCarers.map((cc: CoCarerWithProfile) => (
              <Pressable
                key={cc.id}
                style={styles.row}
                onPress={() =>
                  push(
                    `/(logged-in)/pet/${petId}/co-carer-permissions?userId=${cc.user_id}`,
                  )
                }
              >
                <View style={styles.avatarWrap}>
                  {cc.profile?.avatar_url ? (
                    <Image
                      source={{ uri: cc.profile.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <MaterialCommunityIcons
                        name="account"
                        size={20}
                        color={Colors.gray400}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>
                    {[cc.profile?.first_name, cc.profile?.last_name]
                      .filter(Boolean)
                      .join(" ") || "Co-carer"}
                  </Text>
                  <Text style={styles.rowSub}>Tap to manage permissions</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={Colors.gray400}
                />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  centered: { justifyContent: "center", alignItems: "center" },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: { width: 72, alignItems: "flex-start", justifyContent: "center" },
  navSideRight: { width: 72, alignItems: "center", justifyContent: "center" },
  navBack: { fontFamily: Font.uiSemiBold, fontSize: 16, color: Colors.orange },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionGap: { marginTop: 28 },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  sendBtn: { marginBottom: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  rowIcon: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarWrap: { marginRight: 12 },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: { flex: 1, marginRight: 8 },
  rowName: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  rowSub: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  revokeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  revokeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.error,
  },
});
