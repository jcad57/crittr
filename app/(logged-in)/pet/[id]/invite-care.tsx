import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { usePetDetailsQuery } from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PetInviteCareScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const [email, setEmail] = useState("");

  const { data: details, isLoading } = usePetDetailsQuery(petId ?? null);

  const onInvite = useCallback(() => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Email required", "Enter an email address to send an invite.");
      return;
    }
    Alert.alert(
      "Coming soon",
      `Inviting co-carers by email isn’t available yet. When it launches, you’ll be able to invite ${details?.name?.trim() ?? "this pet"}’s co-carer from here.`,
    );
  }, [email, details?.name]);

  if (isLoading || !details || !petId) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const name = details.name?.trim() || "your pet";

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
          Soon you&apos;ll be able to invite someone by email to help care for{" "}
          {name}. They&apos;ll get access to shared reminders and this pet&apos;s
          profile based on the permissions you choose.
        </Text>
        <Text style={styles.hint}>
          For now, this screen is a preview: enter an email and tap Invite to see
          how it will work.
        </Text>

        <Text style={styles.label}>Email</Text>
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

        <OrangeButton onPress={onInvite} style={styles.cta}>
          Send invite
        </OrangeButton>
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
    marginBottom: 12,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 8,
  },
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
    marginBottom: 20,
  },
  cta: {
    marginTop: 4,
  },
});
