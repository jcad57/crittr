import { ProBottomSheet } from "@/components/pro/ProBottomSheet";
import { ProUpgradeCTA } from "@/components/pro/ProUpgradeCTA";
import { softPaywallCopy, type ProSoftPaywallKind } from "@/constants/proCopy";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { trackProEvent } from "@/lib/proEvents";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { UPGRADE_HREF } from "@/utils/proUpgradePaths";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const KIND_ICONS: Record<
  ProSoftPaywallKind,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  pets: "paw",
  records: "file-document-outline",
  coCare: "heart-outline",
  crittrAi: "creation",
};

type Props = {
  visible: boolean;
  kind: ProSoftPaywallKind | null;
  petName?: string | null;
  onClose: () => void;
};

export function ProSoftPaywallSheet({
  visible,
  kind,
  petName,
  onClose,
}: Props) {
  const { push } = useNavigationCooldown();
  const copy = kind ? softPaywallCopy(kind, petName) : null;

  useEffect(() => {
    if (visible && kind) {
      trackProEvent("pro_soft_paywall_shown", { kind });
    }
  }, [visible, kind]);

  const goUpgrade = () => {
    if (kind) trackProEvent("pro_soft_paywall_cta_tapped", { kind });
    onClose();
    push(UPGRADE_HREF);
  };

  return (
    <ProBottomSheet visible={visible && kind != null} onClose={onClose}>
      {copy && kind ? (
        <View>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={KIND_ICONS[kind]}
              size={26}
              color={Colors.orange}
            />
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.body}>{copy.body}</Text>
          <ProUpgradeCTA onPress={goUpgrade} />
          <Pressable
            onPress={onClose}
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

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.orangeDark,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    letterSpacing: -0.4,
    color: Colors.white,
    marginBottom: 8,
  },
  body: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.white,
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
    color: Colors.white,
  },
});
