import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { CO_CARE_PERMISSION_ROWS } from "@/constants/coCarePermissionRows";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { usePetDetailsQuery, useSendInviteMutation } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { usePetScopedAfterSwitchPet } from "@/hooks/usePetScopedAfterSwitchPet";
import { DEFAULT_CO_CARE_PERMISSIONS, type CoCarePermissions } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InviteCoCarerScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { replace, router } = useNavigationCooldown();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);

  const { data: details, isLoading: detailsLoading } = usePetDetailsQuery(
    petId ?? null,
  );
  const sendInvite = useSendInviteMutation(petId ?? "");

  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<CoCarePermissions>(
    () => ({ ...DEFAULT_CO_CARE_PERMISSIONS }),
  );

  const togglePerm = useCallback((key: keyof CoCarePermissions) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onSend = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Email required", "Enter an email address to send an invite.");
      return;
    }
    sendInvite.mutate(
      { email: trimmed, permissions: perms },
      {
        onSuccess: ({ isRegistered, inviteeNeedsPro, inviteEmailSent }) => {
          const message = inviteeNeedsPro
            ? "They'll get an in-app notification with a link to upgrade to Crittr Pro. After they upgrade, they can accept the invite from Notifications."
            : isRegistered
              ? "They'll see a notification in the app."
              : inviteEmailSent === false
                ? "Your invite was saved in Crittr, but we couldn't send the invitation email. Ask them to download the app and sign up with this email so they see the invite, or try sending again later."
                : "We'll email them an invitation to join Crittr. They'll need Crittr Pro to accept co-care.";
          const emailFailed =
            !isRegistered &&
            !inviteeNeedsPro &&
            inviteEmailSent === false;
          Alert.alert(emailFailed ? "Invite saved" : "Invite sent", message, [
            { text: "OK", onPress: () => router.back() },
          ]);
        },
        onError: (err) => {
          Alert.alert("Error", err.message ?? "Failed to send invite.");
        },
      },
    );
  }, [email, perms, sendInvite, router]);

  if (detailsLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const petName = details.name?.trim() || "this pet";

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Invite co-carer
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Invite co-carer for"
            onAfterSwitchPet={onPetSwitch}
          />
        </View>
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
          You and the person you invite both need Crittr Pro. Choose their email
          and what they can do for {petName}. These settings apply as soon as they
          accept.
        </Text>

        <Text style={styles.sectionLabel}>EMAIL</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="friend@example.com"
          placeholderTextColor={Colors.gray400}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        <Text style={[styles.sectionLabel, styles.sectionGap]}>PERMISSIONS</Text>
        <Text style={styles.permHint}>
          Toggle what they can change. Viewing the pet profile and records is
          always allowed.
        </Text>

        {CO_CARE_PERMISSION_ROWS.map((row) => (
          <View key={row.key} style={styles.permRow}>
            <View style={styles.permIcon}>
              <MaterialCommunityIcons
                name={row.icon as any}
                size={20}
                color={Colors.orange}
              />
            </View>
            <View style={styles.permInfo}>
              <Text style={styles.permLabel}>{row.label}</Text>
              <Text style={styles.permDesc}>{row.description}</Text>
            </View>
            <Switch
              value={perms[row.key]}
              onValueChange={() => togglePerm(row.key)}
              trackColor={{ false: Colors.gray200, true: Colors.orange }}
              thumbColor={Colors.white}
            />
          </View>
        ))}

        <OrangeButton
          onPress={onSend}
          loading={sendInvite.isPending}
          style={styles.sendBtn}
        >
          Send invite
        </OrangeButton>
      </KeyboardAwareScrollView>
    </View>
  );
}

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
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionGap: { marginTop: 8 },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
    marginBottom: 8,
  },
  permHint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  permRow: {
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
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  permInfo: { flex: 1, marginRight: 12 },
  permLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  permDesc: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sendBtn: { marginTop: 20 },
});
