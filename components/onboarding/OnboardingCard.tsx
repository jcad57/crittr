import { Colors } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useRef } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type OnboardingCardProps = {
  children: React.ReactNode;
  scrollKey?: number | string;
};

export default function OnboardingCard({
  children,
  scrollKey,
}: OnboardingCardProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const prevKeyRef = useRef(scrollKey);

  if (prevKeyRef.current !== scrollKey) {
    prevKeyRef.current = scrollKey;
    setTimeout(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), 0);
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={["#FDB97E", "#F4845F", "#F27059"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { paddingBottom: insets.bottom }]}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    marginBottom: 16,
  },
});
