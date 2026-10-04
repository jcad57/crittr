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
import { StyleSheet, Text, View } from "react-native";

const KIND_ICONS: Record<
  ProSoftPaywallKind,
  ComponentProps<typeof MaterialCommunityIcons>["name"]
> = {
  pets: "paw",
  food: "food-outline",
  medications: "pill",
  vaccinations: "needle",
  records: "file-document-outline",
  coCare: "heart-outline",
  crittrAi: "creation",
};

type Props = {
  kind: ProSoftPaywallKind;
  petName?: string | null;
  /** Compact card used under existing list content. */
  compact?: boolean;
};

export function ProSoftPaywallCard({ kind, petName, compact }: Props) {
  const { push } = useNavigationCooldown();
  const copy = softPaywallCopy(kind, petName);

  useEffect(() => {
    trackProEvent("pro_soft_paywall_shown", { kind });
  }, [kind]);

  const goUpgrade = () => {
    trackProEvent("pro_soft_paywall_cta_tapped", { kind });
    push(UPGRADE_HREF);
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <ProUpgradeCTA onPress={goUpgrade} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.orange,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  cardCompact: {
    marginTop: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.orangeLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  body: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  cta: {
    alignSelf: "stretch",
  },
});
