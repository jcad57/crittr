import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from "react-native-reanimated";
import { Colors } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { ProIllustration, flowStyles } from "./ProFlowUi";

function ActivationStep({ index, stage, title, body, last }: { index: number; stage: number; title: string; body: string; last: boolean }) {
  const complete = index < stage;
  const active = index === stage;
  const pulse = useSharedValue(0);
  const completion = useSharedValue(complete ? 1 : 0);
  useEffect(() => {
    completion.value = withTiming(complete ? 1 : 0, { duration: 260, reduceMotion: ReduceMotion.System });
  }, [complete, completion]);
  const circleColor = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(completion.value, [0, 1], [Colors.cream, "#D6E3B6"]),
    borderColor: active ? Colors.orange : interpolateColor(completion.value, [0, 1], ["#D9D4CB", "#D6E3B6"]),
  }));
  useEffect(() => {
    if (active) pulse.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }), -1, true);
    else { cancelAnimation(pulse); pulse.value = 0; }
    return () => cancelAnimation(pulse);
  }, [active, pulse]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.18 + pulse.value * 0.2, transform: [{ scale: 1 + pulse.value * 0.22 }] }));
  return <View style={styles.step}>
    <View style={styles.rail}>
      {!last ? <View style={[styles.connector, complete && { backgroundColor: "#AEC185" }]} /> : null}
      {active ? <Animated.View style={[styles.pulse, ring]} /> : null}
      <Animated.View style={[styles.circle, circleColor]}>
        {complete ? <Animated.View entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}><MaterialCommunityIcons name="check" size={20} color="#314B22" /></Animated.View> : active ? <View style={styles.dot} /> : null}
      </Animated.View>
    </View>
    <View style={styles.stepCopy}><Text style={[styles.stepTitle, !complete && !active && { color: "#73736E" }]}>{title}</Text><Text style={styles.stepBody}>{body}</Text></View>
  </View>;
}

export function ProActivationView({ stage, restored = false }: { stage: 1 | 2 | 3; restored?: boolean }) {
  const { height } = useWindowDimensions();
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(stage === 3 ? "Crittr Pro is ready." : stage === 2 ? "Your Pro access is confirmed." : "Purchase received. Confirming Pro access.");
  }, [stage]);
  return <View style={styles.body}>
    <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(380).reduceMotion(ReduceMotion.System)}>
      <ProIllustration kind="getting-ready" height={height < 780 ? 165 : height < 900 ? 200 : 248} />
      <Text style={[flowStyles.title, { marginTop: 24 }]}>Getting Pro ready.</Text>
      <Text style={flowStyles.subtitle}>{stage === 3 ? "Everything is ready. Welcome to Pro." : "This usually takes a moment."}</Text>
    </Animated.View>
    <View style={styles.steps} accessibilityLiveRegion="polite" accessibilityLabel={stage === 3 ? "Crittr Pro is ready" : stage === 2 ? "Access confirmed. Finishing setup." : "Purchase received. Confirming access."}>
      <ActivationStep index={0} stage={stage} title={restored ? "Subscription found" : "Purchase received"} body={restored ? "Your store account has Pro access." : "Your purchase is saved with the store."} last={false} />
      <ActivationStep index={1} stage={stage} title="Confirming access" body={stage >= 2 ? "Your Crittr Pro access is confirmed." : "Checking your subscription securely…"} last={false} />
      <ActivationStep index={2} stage={stage} title="Ready to care" body={stage === 3 ? "All your Pro features are unlocked." : "Getting everything ready for you."} last />
    </View>
  </View>;
}
const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", paddingBottom: 28 },
  steps: { marginTop: 34, marginBottom: 10 }, step: { flexDirection: "row", minHeight: 82, gap: 15 },
  rail: { width: 34, alignItems: "center", position: "relative" },
  circle: { width: 29, height: 29, borderRadius: 15, borderWidth: 2, borderColor: "#D9D4CB", backgroundColor: Colors.cream, alignItems: "center", justifyContent: "center", marginTop: 1 },
  pulse: { position: "absolute", top: -4, width: 39, height: 39, borderRadius: 20, backgroundColor: Colors.orange },
  dot: { width: 17, height: 17, borderRadius: 9, backgroundColor: Colors.orange },
  connector: { position: "absolute", top: 31, bottom: 5, width: 1.5, backgroundColor: "#D9D4CB" },
  stepCopy: { flex: 1, paddingTop: 3 }, stepTitle: { fontFamily: Font.uiBold, fontSize: 16, color: Colors.textPrimary },
  stepBody: { fontFamily: Font.uiRegular, fontSize: 13, lineHeight: 19, color: "#70716C", marginTop: 5 },
});
