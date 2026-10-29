import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { OrganicSurface, ProIllustration, ProLink, flowStyles, type ProIcon } from "./ProFlowUi";

export function ProFreePlanView({ onUpgrade, onExit, onRestore }: { onUpgrade: () => void; onExit: () => void; onRestore: () => void }) {
  const included: { icon: ProIcon; title: string; body: string }[] = [
    { icon: "paw-outline", title: "3 pets", body: "Includes memorialized pets" },
    { icon: "account-group-outline", title: "1 co-carer per pet", body: "Invite a friend or family member" },
    { icon: "clipboard-text-outline", title: "Unlimited activity logs", body: "Keep track of all their care" },
    { icon: "pill", title: "Foods, medications and vaccinations", body: "Save as many as you need" },
  ];
  return <View style={{ gap: 20, paddingBottom: 12 }}>
    <ProIllustration height={155} />
    <View><Text style={flowStyles.title}>Plenty of care,{'\n'}on Free.</Text><Text style={flowStyles.subtitle}>The essentials to help keep your pets happy and cared for, every day.</Text></View>
    <OrganicSurface color={Colors.sage} style={{ padding: 22, gap: 22 }}>{included.map((row) => <View key={row.title} style={{ flexDirection: "row", gap: 16, alignItems: "center" }}><MaterialCommunityIcons name={row.icon} size={29} color={Colors.textPrimary} /><View style={{ flex: 1 }}><Text style={{ fontFamily: Font.uiBold, color: Colors.textPrimary, fontSize: 15 }}>{row.title}</Text><Text style={{ fontFamily: Font.uiRegular, color: "#64685D", fontSize: 12, lineHeight: 17, marginTop: 4 }}>{row.body}</Text></View></View>)}</OrganicSurface>
    <OrangeButton onPress={onExit}>Back to my pets</OrangeButton>
    <View><ProLink onPress={onUpgrade}>Explore Crittr Pro</ProLink><ProLink onPress={onRestore}>Restore purchases</ProLink></View>
  </View>;
}
