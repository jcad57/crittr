import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { HealthTrafficKind } from "@/utils/healthTraffic";
import { StyleSheet, Text, View } from "react-native";

const PALETTE: Record<
  HealthTrafficKind,
  { bg: string; text: string }
> = {
  due_today: { bg: Colors.signOutCoralIconBg, text: Colors.signOutCoral },
  due_soon: { bg: Colors.progressMedsTrack, text: Colors.amberDark },
  current: { bg: Colors.successLight, text: Colors.successDark },
};

type Props = {
  kind: HealthTrafficKind;
  label: string;
};

export default function HealthTrafficBadge({ kind, label }: Props) {
  const p = PALETTE[kind];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]}>
      <Text style={[styles.text, { color: p.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: "42%",
  },
  text: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
  },
});
