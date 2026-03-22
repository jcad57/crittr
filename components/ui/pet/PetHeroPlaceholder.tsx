import { Colors } from "@/constants/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Ellipse } from "react-native-svg";

type PetHeroPlaceholderProps = {
  onBack: () => void;
  onOptions: () => void;
};

export const HERO_HEIGHT = 300;

export default function PetHeroPlaceholder({
  onBack,
  onOptions,
}: PetHeroPlaceholderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.hero}>
      {/* Warm gradient-style background layers */}
      <View style={styles.bgOuter} />
      <View style={styles.bgInner} />

      {/* Decorative ambient circles */}
      <View style={[styles.deco, styles.decoTopRight]} />
      <View style={[styles.deco, styles.decoBottomLeft]} />

      {/* Paw SVG centrepiece */}
      <View style={styles.pawContainer}>
        <Svg width={160} height={160} viewBox="0 0 100 100">
          {/* Main pad */}
          <Ellipse
            cx="50"
            cy="62"
            rx="22"
            ry="18"
            fill="rgba(255,255,255,0.35)"
          />
          {/* Toe pads */}
          <Ellipse
            cx="28"
            cy="44"
            rx="9"
            ry="11"
            fill="rgba(255,255,255,0.3)"
          />
          <Ellipse
            cx="41"
            cy="36"
            rx="9"
            ry="11"
            fill="rgba(255,255,255,0.3)"
          />
          <Ellipse
            cx="59"
            cy="36"
            rx="9"
            ry="11"
            fill="rgba(255,255,255,0.3)"
          />
          <Ellipse
            cx="72"
            cy="44"
            rx="9"
            ry="11"
            fill="rgba(255,255,255,0.3)"
          />
          {/* Inner pad details */}
          <Ellipse
            cx="50"
            cy="62"
            rx="12"
            ry="10"
            fill="rgba(255,255,255,0.2)"
          />
        </Svg>
      </View>

      {/* Subtle watermark paws */}
      <View style={styles.watermarkTopLeft} pointerEvents="none">
        <Svg width={48} height={48} viewBox="0 0 100 100" opacity={0.12}>
          <Ellipse cx="50" cy="62" rx="22" ry="18" fill="white" />
          <Ellipse cx="28" cy="44" rx="9" ry="11" fill="white" />
          <Ellipse cx="41" cy="36" rx="9" ry="11" fill="white" />
          <Ellipse cx="59" cy="36" rx="9" ry="11" fill="white" />
          <Ellipse cx="72" cy="44" rx="9" ry="11" fill="white" />
        </Svg>
      </View>
      <View style={styles.watermarkBottomRight} pointerEvents="none">
        <Svg width={64} height={64} viewBox="0 0 100 100" opacity={0.1}>
          <Ellipse cx="50" cy="62" rx="22" ry="18" fill="white" />
          <Ellipse cx="28" cy="44" rx="9" ry="11" fill="white" />
          <Ellipse cx="41" cy="36" rx="9" ry="11" fill="white" />
          <Ellipse cx="59" cy="36" rx="9" ry="11" fill="white" />
          <Ellipse cx="72" cy="44" rx="9" ry="11" fill="white" />
        </Svg>
      </View>

      {/* Nav controls */}
      <View style={[styles.navBar, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.navButton} onPress={onBack} hitSlop={8}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={Colors.white}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={onOptions}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="dots-vertical"
            size={22}
            color={Colors.white}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: HERO_HEIGHT,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bgOuter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.amber,
    opacity: 0.4,
  },
  bgInner: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.orangeDark,
    opacity: 0.2,
  },
  deco: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  decoTopRight: {
    width: 120,
    height: 120,
    top: -40,
    right: -30,
  },
  decoBottomLeft: {
    width: 80,
    height: 80,
    bottom: 20,
    left: -20,
  },
  pawContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkTopLeft: {
    position: "absolute",
    top: 60,
    left: 24,
    transform: [{ rotate: "-20deg" }],
  },
  watermarkBottomRight: {
    position: "absolute",
    bottom: 50,
    right: 24,
    transform: [{ rotate: "15deg" }],
  },
  navBar: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
});
