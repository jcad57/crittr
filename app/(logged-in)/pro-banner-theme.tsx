import ProHeroWithShine from "@/components/profile/ProHeroWithShine";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import {
  PRO_BANNER_THEME_ORDER,
  type ProBannerThemeId,
  normalizeProBannerThemeId,
  resolveProBannerTheme,
} from "@/constants/proBannerThemes";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { profileQueryKey, useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { queryClient } from "@/lib/queryClient";
import { updateProfile } from "@/services/profiles";
import { useAuthStore } from "@/stores/authStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const ORANGE_BUTTON_WRAPPER_HEIGHT = 55;
const BOTTOM_BAR_PADDING_TOP = 8;

export default function ProBannerThemeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile, isLoading: isProfileLoading } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const userId = session?.user?.id;

  const savedThemeId = useMemo(
    () => normalizeProBannerThemeId(profile?.crittr_pro_banner_theme),
    [profile?.crittr_pro_banner_theme],
  );

  const [selected, setSelected] = useState<ProBannerThemeId>(savedThemeId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(savedThemeId);
  }, [savedThemeId]);

  useEffect(() => {
    if (isProfileLoading) return;
    if (profile != null && !isPro) {
      router.back();
    }
  }, [isProfileLoading, profile, isPro, router]);

  const listPaddingBottom =
    BOTTOM_BAR_PADDING_TOP + ORANGE_BUTTON_WRAPPER_HEIGHT + insets.bottom;

  const dirty = selected !== savedThemeId;

  const onSave = useCallback(async () => {
    if (!userId || !dirty) return;
    setSaving(true);
    try {
      const updated = await updateProfile(userId, {
        crittr_pro_banner_theme: selected,
      });
      if (updated) {
        setProfile(updated);
        await queryClient.invalidateQueries({
          queryKey: profileQueryKey(userId),
        });
        router.back();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Could not save", msg);
    } finally {
      setSaving(false);
    }
  }, [userId, dirty, selected, setProfile, router]);

  if (isProfileLoading && !profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 8 }]}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (!isPro) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.navBackHit}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Pro banner
        </Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: listPaddingBottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Choose a color scheme for your profile hero and the crown badge on
          your dashboard.
        </Text>

        <View style={styles.previews}>
          {PRO_BANNER_THEME_ORDER.map((id) => {
            const theme = resolveProBannerTheme(id);
            const isChosen = selected === id;
            return (
              <Pressable
                key={id}
                onPress={() => setSelected(id)}
                style={({ pressed }) => [
                  styles.previewOuter,
                  isChosen && styles.previewOuterSelected,
                  pressed && styles.previewOuterPressed,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isChosen }}
                accessibilityLabel={`${theme.label} theme`}
              >
                {isChosen ? (
                  <View style={styles.selectedBadge} pointerEvents="none">
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={22}
                      color={Colors.orange}
                    />
                  </View>
                ) : null}
                <Text style={styles.previewLabel}>{theme.label}</Text>
                <Text style={styles.previewSubtitle}>{theme.subtitle}</Text>
                <ProHeroWithShine themeId={id} compact>
                  <View style={styles.previewHeroInner}>
                    <View
                      style={[
                        styles.previewPill,
                        {
                          backgroundColor: theme.memberPillBackground,
                          borderColor: theme.memberPillBorder,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="crown-outline"
                        size={14}
                        color={theme.crownIconColor}
                      />
                      <Text
                        style={[
                          styles.previewPillText,
                          { color: theme.memberPillText },
                        ]}
                      >
                        Crittr Pro
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.previewHeroHint,
                        { color: theme.memberPillText },
                      ]}
                    >
                      How it will look on your profile
                    </Text>
                  </View>
                </ProHeroWithShine>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
        <OrangeButton
          onPress={onSave}
          disabled={!dirty}
          loading={saving}
          accessibilityLabel="Save Pro banner theme"
        >
          Save
        </OrangeButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.creamDark,
  },
  navBackHit: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  navSpacer: {
    width: 40,
    height: 40,
  },
  scroll: { flex: 1 },
  body: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  previews: {
    gap: 14,
  },
  previewOuter: {
    borderRadius: 20,
    padding: 12,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
    position: "relative",
  },
  previewOuterSelected: {
    borderColor: Colors.orange,
    backgroundColor: "rgba(255, 122, 26, 0.06)",
  },
  previewOuterPressed: {
    opacity: 0.92,
  },
  selectedBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  previewLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.gray500,
    marginBottom: 10,
    lineHeight: 18,
  },
  previewHeroInner: {
    alignItems: "center",
    gap: 10,
  },
  previewPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  previewPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  previewHeroHint: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    opacity: 0.85,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: BOTTOM_BAR_PADDING_TOP,
    backgroundColor: Colors.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.creamDark,
  },
});
