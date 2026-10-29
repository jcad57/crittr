import { useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View, Platform } from "react-native";
import { getPurchaseEnvironment, purchaseEnvironmentCopy, type PurchaseEnvironment } from "@/lib/iap/purchaseEnvironment";
import { createThemeValues, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";

export function PurchaseEnvironmentNotice() {
  const styles = useThemeValues(getStyles);
  const [environment, setEnvironment] = useState<PurchaseEnvironment | null>(null);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let active = true;
    const refresh = () => { void getPurchaseEnvironment().then((value) => { if (active) setEnvironment(value); }).catch(() => { if (active) setEnvironment("unknown"); }); };
    refresh();
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") refresh(); });
    return () => { active = false; subscription.remove(); };
  }, []);
  if (Platform.OS !== "ios") return null;
  const copy = environment ? purchaseEnvironmentCopy(environment) : { title: "Checking purchase environment…", message: "Confirming this app’s store environment." };
  return <View style={styles.notice} accessibilityLiveRegion="polite">
    <Text style={styles.title}>{copy.title}</Text>
    <Text style={styles.message}>{copy.message}</Text>
  </View>;
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  notice: { marginHorizontal: 22, marginTop: 4, marginBottom: 8, padding: 12, backgroundColor: Colors.skyLight, borderRadius: 14, maxWidth: 476, width: "90%", alignSelf: "center" },
  title: { fontFamily: Font.uiBold, fontSize: 12, lineHeight: 17, color: Colors.skyDark },
  message: { fontFamily: Font.uiRegular, fontSize: 11, lineHeight: 16, color: Colors.skyDark, marginTop: 3 },
}));
