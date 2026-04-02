import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { CO_CARE_PERMISSION_ROWS } from "@/constants/coCarePermissionRows";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useCoCarersForPetQuery,
  usePetDetailsQuery,
  useRemoveCoCarerMutation,
  useUpdatePermissionsMutation,
} from "@/hooks/queries";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import type { CoCarePermissions } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function CoCarerPermissionsScreen() {
  const { id: rawId, userId: rawUserId } = useLocalSearchParams<{
    id: string;
    userId: string;
  }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const coCarerUserId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollInsetBottom = useFloatingNavScrollInset();

  const { data: details } = usePetDetailsQuery(petId ?? null);
  const { data: coCarers = [] } = useCoCarersForPetQuery(petId);
  const updatePermissions = useUpdatePermissionsMutation(petId ?? "");
  const removeCoCarerMut = useRemoveCoCarerMutation(petId ?? "");

  const coCarer = useMemo(
    () => coCarers.find((c) => c.user_id === coCarerUserId),
    [coCarers, coCarerUserId],
  );

  const [perms, setPerms] = useState<CoCarePermissions | null>(null);

  useEffect(() => {
    if (coCarer) {
      setPerms(coCarer.permissions);
    }
  }, [coCarer]);

  const togglePerm = useCallback((key: keyof CoCarePermissions) => {
    setPerms((prev) => (prev ? { ...prev, [key]: !prev[key] } : prev));
  }, []);

  const handleSave = useCallback(() => {
    if (!perms || !coCarerUserId) return;
    updatePermissions.mutate(
      { coCarerUserId, permissions: perms },
      {
        onSuccess: () => {
          Alert.alert("Saved", "Permissions updated.");
        },
        onError: (err) => {
          Alert.alert("Error", err.message ?? "Failed to update permissions.");
        },
      },
    );
  }, [perms, coCarerUserId, updatePermissions]);

  const handleRemove = useCallback(() => {
    if (!coCarerUserId) return;
    const displayName =
      [coCarer?.profile?.first_name, coCarer?.profile?.last_name]
        .filter(Boolean)
        .join(" ") || "this co-carer";

    Alert.alert(
      "Remove co-carer?",
      `${displayName} will no longer be able to access ${details?.name ?? "this pet"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () =>
            removeCoCarerMut.mutate(coCarerUserId, {
              onSuccess: () => router.back(),
              onError: (err) =>
                Alert.alert(
                  "Error",
                  err.message ?? "Failed to remove co-carer.",
                ),
            }),
        },
      ],
    );
  }, [coCarerUserId, coCarer, details, removeCoCarerMut, router]);

  if (!petId || !coCarerUserId || !coCarer || !perms) {
    return (
      <View
        style={[styles.screen, styles.centered, { paddingTop: insets.top }]}
      >
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  const displayName =
    [coCarer.profile?.first_name, coCarer.profile?.last_name]
      .filter(Boolean)
      .join(" ") || "Co-carer";

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
          Permissions
        </Text>
        <View style={styles.navSideRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: scrollInsetBottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          {coCarer.profile?.avatar_url ? (
            <Image
              source={{ uri: coCarer.profile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialCommunityIcons
                name="account"
                size={28}
                color={Colors.gray400}
              />
            </View>
          )}
          <View style={styles.displayNameContainer}>
            <Text style={styles.displayName}>{displayName}</Text>
            <Text style={styles.roleLabel}>
              Co-carer for {details?.name ?? "this pet"}
            </Text>
          </View>
        </View>

        {/* Permission toggles */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          PERMISSIONS
        </Text>
        <Text style={styles.permHint}>
          Toggle what {displayName} can do. Viewing the pet profile and records
          is always allowed.
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
          onPress={handleSave}
          disabled={updatePermissions.isPending}
          style={styles.saveBtn}
        >
          {updatePermissions.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            "Save changes"
          )}
        </OrangeButton>

        {/* Danger zone */}
        <Pressable
          onPress={handleRemove}
          style={styles.removeBtn}
          disabled={removeCoCarerMut.isPending}
        >
          {removeCoCarerMut.isPending ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <Text style={styles.removeText}>Remove co-carer</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 64;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.cream },
  centered: { justifyContent: "center", alignItems: "center" },
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
  navSideRight: { width: 72 },
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  displayNameContainer: {
    flexShrink: 1,
    justifyContent: "center",
    minHeight: AVATAR_SIZE,
  },
  displayName: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  roleLabel: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
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
  saveBtn: { marginTop: 24 },
  removeBtn: {
    alignSelf: "center",
    paddingVertical: 16,
    marginTop: 8,
  },
  removeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.error,
  },
});
