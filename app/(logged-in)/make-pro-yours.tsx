import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { displayNameFromProfile, initialsFromProfile } from "@/components/profile/profileHelpers";
import { OrganicSurface, ProFlowPage, ProLink, getFlowStyles, type ProIcon } from "@/components/pro/flow/ProFlowUi";
import { usePetsQuery, useProfileQuery } from "@/hooks/queries";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { trackProEvent } from "@/lib/proEvents";
import { markProOnboardingCompleted } from "@/lib/proEngagementPersistence";
import { useAuthStore } from "@/stores/authStore";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { isPetActiveForDashboard } from "@/utils/petParticipation";
import type { Href } from "expo-router";

export default function MakeProYoursScreen() {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const flowStyles = useThemeValues(getFlowStyles);
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { data: profile } = useProfileQuery();
  const { data: pets, isLoading: petsLoading, isError, refetch } = usePetsQuery();
  const { runWithProOrUpgrade } = useProGateNavigation();
  const owned = pets?.filter((p) => p.role === "owner" && isPetActiveForDashboard(p)) ?? [];
  const selected = owned.find((p) => p.is_active) ?? owned[0];
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const email = useAuthStore((s) => s.session?.user?.email) ?? "";
  useEffect(() => { trackProEvent("pro_onboarding_step_completed", { step: "make_pro_yours" }); }, []);
  const finish = useCallback((href: Href) => {
    const uid = useAuthStore.getState().session?.user?.id;
    if (uid) void markProOnboardingCompleted(uid).catch(() => {});
    trackProEvent("pro_onboarding_completed", { step: "make_pro_yours" });
    router.replace(href);
  }, [router]);
  const open = (href: Href) => { void runWithProOrUpgrade(() => finish(href)); };
  const cards: { icon: ProIcon; title: string; body: string; color: string; href: Href; needsPet: boolean }[] = [
    { icon: "paw-outline", title: "Add another pet", body: "There’s always room for one more.", color: Colors.sage, href: "/(logged-in)/add-pet", needsPet: false },
    { icon: "file-document-plus-outline", title: "Upload a medical record", body: selected ? `Keep ${selected.name}’s notes, results and documents safe.` : "Add a pet to keep their documents together.", color: Colors.lavenderLight, href: selected ? `/(logged-in)/pet/${selected.id}/medical-records` : "/(logged-in)/add-pet", needsPet: true },
    { icon: "creation-outline", title: "Ask CrittrAI", body: "Get a little extra help with your pet’s care.", color: Colors.skyLight, href: "/(logged-in)/crittr-ai", needsPet: false },
  ];
  return <ProFlowPage brand={false} onBack={() => finish("/(logged-in)/(tabs)/dashboard")} footer={<OrangeButton onPress={() => finish(returnTo === "subscriptions" ? "/(logged-in)/subscriptions" : returnTo === "settings" ? "/(logged-in)/settings" : "/(logged-in)/(tabs)/dashboard")}>{returnTo === "subscriptions" ? "View my subscription" : returnTo === "settings" ? "Back to settings" : "Go to my dashboard"}</OrangeButton>}>
    <Text style={[flowStyles.title, { marginTop: 12 }]}>Make Pro yours.</Text>
    <Text style={flowStyles.subtitle}>A few simple ways to get the most{"\n"}out of your new features.</Text>
    <View style={styles.identity}>
      {profile?.avatar_url && failedAvatar !== profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" accessibilityLabel="Your profile photo" onError={() => setFailedAvatar(profile.avatar_url)} /> : <View style={[styles.avatar, styles.initials]}><Text style={styles.initialsText}>{initialsFromProfile(profile ?? null, email)}</Text></View>}
      <View style={{ flex: 1 }}><Text style={styles.name}>{displayNameFromProfile(profile ?? null)}</Text><Text style={styles.member}>Crittr Pro member</Text></View>
      <MaterialCommunityIcons name="heart-outline" size={24} color={Colors.textPrimary} />
    </View>
    <View style={{ gap: 13, marginBottom: 10 }}>{cards.map((card) => <Pressable key={card.title} onPress={() => open(card.href)} disabled={card.needsPet && (petsLoading || isError)} accessibilityRole="button" accessibilityLabel={`${card.title}. ${card.body}`} style={({ pressed }) => [pressed && { opacity: 0.75 }, card.needsPet && (petsLoading || isError) && { opacity: 0.55 }]}>
      <OrganicSurface color={card.color} style={styles.actionCard}>
        <MaterialCommunityIcons name={card.icon} size={36} color={Colors.textPrimary} />
        <View style={{ flex: 1 }}><Text style={styles.actionTitle}>{card.title}</Text><Text style={styles.actionBody}>{card.body}</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={23} color={Colors.textPrimary} />
      </OrganicSurface>
    </Pressable>)}</View>
    {isError ? <ProLink onPress={() => void refetch()}>Couldn’t load your pets. Try again</ProLink> : selected ? <ProLink onPress={() => open(`/(logged-in)/pet/${selected.id}/invite-care`)}>Invite your care team</ProLink> : null}
  </ProFlowPage>;
}
const getStyles = createThemeValues((Colors) => StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 23, borderWidth: 1, borderColor: Colors.creamDark, padding: 17, marginTop: 22, marginBottom: 22 },
  avatar: { width: 64, height: 64, borderRadius: 32 }, initials: { backgroundColor: Colors.peach, alignItems: "center", justifyContent: "center" }, initialsText: { fontFamily: Font.displayBold, fontSize: 24, color: Colors.peachDark },
  name: { fontFamily: Font.displayBold, fontSize: 23, color: Colors.textPrimary }, member: { fontFamily: Font.uiRegular, fontSize: 14, color: "#696A64", marginTop: 3 },
  actionCard: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 18, paddingHorizontal: 18 },
  actionTitle: { fontFamily: Font.uiBold, fontSize: 16, color: Colors.textPrimary }, actionBody: { fontFamily: Font.uiRegular, fontSize: 13, lineHeight: 19, color: "#62645F", marginTop: 6 },
}));
