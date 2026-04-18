import PetPillSwitcher from "@/components/ui/pets/PetPillSwitcher";
import { Colors } from "@/constants/colors";
import {
  PRO_GRADIENT_END,
  PRO_GRADIENT_START,
  normalizeProBannerThemeId,
  resolveProBannerTheme,
} from "@/constants/proBannerThemes";
import { Font, MAIN_SCREEN_TITLE_SIZE } from "@/constants/typography";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import type { PetSummary } from "@/types/ui";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

function greetingLine(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type DashboardHeaderProps = {
  pets: PetSummary[];
  activePetId: string | null;
  onSwitchPet: (id: string) => void;
  onAddPet?: () => void;
  onNotificationsPress?: () => void;
  onProfilePress?: () => void;
  unreadNotificationCount?: number;
};

export default function DashboardHeader({
  pets,
  activePetId,
  onSwitchPet,
  onAddPet,
  onNotificationsPress,
  onProfilePress,
  unreadNotificationCount = 0,
}: DashboardHeaderProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { data: profile } = useProfileQuery();
  const profileAvatarUri = profile?.avatar_url?.trim() || null;
  const isPro = useIsCrittrPro(profile);
  const proBannerTheme = resolveProBannerTheme(
    normalizeProBannerThemeId(profile?.crittr_pro_banner_theme),
  );

  /** Smaller title on narrow screens so “Good morning” / “Good afternoon” isn’t clipped by flex layout. */
  const greetingTitleSize = useMemo(() => {
    if (windowWidth < 340) return 22;
    if (windowWidth < 380) return 24;
    return MAIN_SCREEN_TITLE_SIZE;
  }, [windowWidth]);
  const greetingLineHeight = greetingTitleSize + 6;

  const { greeting, dateLine } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dateLine = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    return { greeting: greetingLine(hour), dateLine };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.greetingColumn}>
          <Text
            style={[
              styles.greeting,
              { fontSize: greetingTitleSize, lineHeight: greetingLineHeight },
            ]}
          >
            {greeting}
          </Text>
          <Text style={styles.date}>{dateLine}</Text>
        </View>
        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.circleButton}
            onPress={onNotificationsPress}
            hitSlop={8}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={22}
              color={Colors.gray800}
            />
            {unreadNotificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.profileAvatarWrap}>
            <TouchableOpacity
              style={[
                styles.circleButton,
                profileAvatarUri && styles.circleButtonWithPhoto,
              ]}
              onPress={onProfilePress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={
                isPro ? "Open profile, Crittr Pro member" : "Open profile"
              }
            >
              {profileAvatarUri ? (
                <Image
                  source={{ uri: profileAvatarUri }}
                  style={styles.profileAvatarImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                />
              ) : (
                <MaterialCommunityIcons
                  name="account-circle-outline"
                  size={24}
                  color={Colors.gray800}
                />
              )}
            </TouchableOpacity>
            {isPro ? (
              <LinearGradient
                colors={
                  proBannerTheme.innerGradient.colors as [
                    string,
                    string,
                    ...string[],
                  ]
                }
                locations={
                  proBannerTheme.innerGradient.locations as [
                    number,
                    number,
                    ...number[],
                  ]
                }
                start={PRO_GRADIENT_START}
                end={PRO_GRADIENT_END}
                style={[
                  styles.proCrownBadge,
                  {
                    borderColor: proBannerTheme.crownBadgeBorder,
                    shadowColor: proBannerTheme.crownBadgeShadowColor,
                  },
                ]}
                dither
              >
                <MaterialCommunityIcons
                  name="crown"
                  size={13}
                  color={proBannerTheme.crownIconColor}
                />
              </LinearGradient>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.pillBlock}>
        <PetPillSwitcher
          pets={pets}
          activePetId={activePetId}
          onSwitchPet={onSwitchPet}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  /** Greeting + date stacked tight; avoids row height following the 40px icon buttons. */
  greetingColumn: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
    gap: 2,
  },
  greeting: {
    fontFamily: Font.displayBold,
    fontSize: MAIN_SCREEN_TITLE_SIZE,
    lineHeight: 34,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  date: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginTop: 0,
    marginBottom: 10,
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flexShrink: 0,
  },
  profileAvatarWrap: {
    width: 40,
    height: 40,
    position: "relative",
  },
  /** Shiny pill behind crown; sits on avatar rim (top-right). */
  proCrownBadge: {
    position: "absolute",
    right: -8,
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 4,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  circleButtonWithPhoto: {
    padding: 0,
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  pillBlock: {
    marginTop: 8,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.gray300,
    backgroundColor: "transparent",
  },
  addPillText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.gray500,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: Colors.cream,
  },
  badgeText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 10,
    color: Colors.white,
    lineHeight: 14,
  },
});
