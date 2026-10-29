import { ProBottomSheet } from "@/components/pro/ProBottomSheet";
import { ProUpgradeCTA } from "@/components/pro/ProUpgradeCTA";
import { createThemeValues, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { milestoneCelebrationCopy } from "@/constants/proCopy";
import { useActivityMilestoneCelebration } from "@/hooks/useActivityMilestoneCelebration";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { trackProEvent } from "@/lib/proEvents";
import { UPGRADE_HREF } from "@/utils/proUpgradePaths";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ActivityMilestoneCelebrationHost() {
  const styles = useThemeValues(getStyles);
  const { offer, dismiss, completeShown } = useActivityMilestoneCelebration();
  const { push } = useNavigationCooldown();
  const copy = offer
    ? milestoneCelebrationCopy(offer.petName, offer.activityCount)
    : null;

  const onCta = () => {
    if (offer) {
      trackProEvent("pro_progress_celebration_cta_tapped", {
        milestone: offer.milestone,
      });
    }
    completeShown();
    push(UPGRADE_HREF);
  };

  return (
    <ProBottomSheet visible={offer != null} onClose={dismiss}>
      {offer && copy ? (
        <View>
          {offer.petAvatarUrl ? (
            <Image
              source={{ uri: offer.petAvatarUrl }}
              style={styles.avatar}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>
                {offer.petName.trim().charAt(0).toUpperCase() || "P"}
              </Text>
            </View>
          )}
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <Text style={styles.invite}>{copy.invite}</Text>
          <ProUpgradeCTA onPress={onCta} />
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.dismiss,
              pressed && styles.dismissPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Not now"
            hitSlop={8}
          >
            <Text style={styles.dismissText}>Not now</Text>
          </Pressable>
        </View>
      ) : null}
    </ProBottomSheet>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 14,
    backgroundColor: Colors.orangeLight,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 14,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.orangeDark,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  body: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  invite: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: 22,
  },
  dismiss: {
    alignSelf: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dismissPressed: {
    opacity: 0.7,
  },
  dismissText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
}));
