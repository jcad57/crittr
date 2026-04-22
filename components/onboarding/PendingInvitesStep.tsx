import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  pendingInvitesKey,
  petsQueryKey,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  usePendingInvitesQuery,
  type PendingInviteRow,
} from "@/hooks/queries";
import { queryClient } from "@/lib/queryClient";
import { CO_CARE_ACCEPT_NEEDS_PRO_MESSAGE } from "@/services/coCare";
import { useAuthStore } from "@/stores/authStore";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useShallow } from "zustand/react/shallow";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PendingInvitesStep() {
  const session = useAuthStore((s) => s.session);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const { nextStep, prevStep, skippedPendingInvitesEmpty, setSkippedPendingInvitesEmpty } =
    useOnboardingStore(
      useShallow((s) => ({
        nextStep: s.nextStep,
        prevStep: s.prevStep,
        skippedPendingInvitesEmpty: s.skippedPendingInvitesEmpty,
        setSkippedPendingInvitesEmpty: s.setSkippedPendingInvitesEmpty,
      })),
    );
  const router = useRouter();

  const { data: invitesData, isLoading } = usePendingInvitesQuery();
  const invites = invitesData ?? [];
  const loading = isLoading;

  const [busy, setBusy] = useState<string | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);

  const acceptMut = useAcceptInviteMutation();
  const declineMut = useDeclineInviteMutation();

  /** Optimistic removal from the cached pending-invites list so the UI updates without waiting for refetch. */
  const removeInviteFromCache = useCallback(
    (inviteId: string) => {
      if (!session?.user.id) return;
      queryClient.setQueryData<PendingInviteRow[]>(
        pendingInvitesKey(session.user.id),
        (prev) => (prev ?? []).filter((i) => i.id !== inviteId),
      );
    },
    [session?.user.id],
  );

  useEffect(() => {
    if (!session || loading) return;
    if (invites.length > 0 || acceptedCount !== 0) return;
    if (skippedPendingInvitesEmpty) return;
    setSkippedPendingInvitesEmpty(true);
    nextStep();
  }, [
    session,
    loading,
    invites.length,
    acceptedCount,
    skippedPendingInvitesEmpty,
    nextStep,
    setSkippedPendingInvitesEmpty,
  ]);

  const handleAccept = useCallback(
    async (inviteId: string) => {
      if (!session) return;
      setBusy(inviteId);
      try {
        await acceptMut.mutateAsync(inviteId);
        removeInviteFromCache(inviteId);
        setAcceptedCount((c) => c + 1);
      } catch (err: any) {
        const msg = err.message ?? "Could not accept invite.";
        Alert.alert(
          msg === CO_CARE_ACCEPT_NEEDS_PRO_MESSAGE
            ? "Crittr Pro required"
            : "Error",
          msg,
        );
      } finally {
        setBusy(null);
      }
    },
    [session, acceptMut, removeInviteFromCache],
  );

  const handleDecline = useCallback(
    async (inviteId: string) => {
      setBusy(inviteId);
      try {
        await declineMut.mutateAsync(inviteId);
        removeInviteFromCache(inviteId);
      } catch (err: any) {
        Alert.alert("Error", err.message ?? "Could not decline invite.");
      } finally {
        setBusy(null);
      }
    },
    [declineMut, removeInviteFromCache],
  );

  const handleContinue = useCallback(async () => {
    if (!session) return;
    if (acceptedCount > 0) {
      setBusy("finishing");
      try {
        await completeOnboarding();
        await queryClient.invalidateQueries({
          queryKey: petsQueryKey(session.user.id),
        });
        router.replace("/(logged-in)/dashboard");
      } catch (err: any) {
        Alert.alert("Error", err.message ?? "Failed to complete setup.");
      } finally {
        setBusy(null);
      }
    } else {
      nextStep();
    }
  }, [session, acceptedCount, completeOnboarding, nextStep, router]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (invites.length === 0 && acceptedCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCenter}>
        <MaterialCommunityIcons
          name="account-group"
          size={48}
          color={Colors.orange}
        />
      </View>

      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 8 }]}>
        You&apos;ve been invited!
      </Text>
      <Text style={[authOnboardingStyles.screenSubtitle, { marginBottom: 24 }]}>
        {acceptedCount > 0 && invites.length === 0
          ? "You accepted an invite. You can start co-caring right away, or add your own pet too."
          : "Someone wants to share pet care with you. Accept to get started."}
      </Text>

      {invites.map((inv) => (
        <View key={inv.id} style={styles.inviteCard}>
          <View style={styles.inviteInfo}>
            <Text style={styles.invitePetName}>{inv.pet_name ?? "A pet"}</Text>
            {inv.inviter_name ? (
              <Text style={styles.inviteFrom}>
                Invited by {inv.inviter_name}
              </Text>
            ) : null}
          </View>
          <View style={styles.inviteActions}>
            {busy === inv.id ? (
              <ActivityIndicator size="small" color={Colors.orange} />
            ) : (
              <>
                <Pressable
                  style={styles.acceptBtn}
                  onPress={() => handleAccept(inv.id)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable
                  style={styles.declineBtn}
                  onPress={() => handleDecline(inv.id)}
                >
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ))}

      <View style={styles.spacer} />

      <OrangeButton
        onPress={handleContinue}
        loading={busy === "finishing"}
        style={styles.cta}
      >
        {acceptedCount > 0 ? "Go to Dashboard" : "Skip, I'll add my own pet"}
      </OrangeButton>

      {acceptedCount > 0 && (
        <Pressable onPress={nextStep} style={styles.addOwnPetBtn}>
          <Text style={styles.addOwnPetText}>
            I also want to add my own pet
          </Text>
        </Pressable>
      )}

      <Pressable onPress={prevStep} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  iconCenter: { alignItems: "center", marginBottom: 16, marginTop: 12 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: 14,
    backgroundColor: Colors.white,
    marginBottom: 12,
  },
  inviteInfo: { flex: 1, marginRight: 12 },
  invitePetName: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inviteFrom: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  acceptBtn: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptText: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.white,
  },
  declineBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  declineText: {
    fontFamily: Font.uiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  spacer: { flex: 1, minHeight: 24 },
  cta: { marginTop: 16 },
  addOwnPetBtn: { alignSelf: "center", paddingVertical: 12 },
  addOwnPetText: {
    fontFamily: Font.uiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  backButton: { alignSelf: "center", paddingVertical: 16 },
});
