import { Colors } from "@/constants/colors";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Svg, { Ellipse } from "react-native-svg";

type PetHeroProps = {
  imageUrl?: string | null;
};

/** Short gradient band only — keeps vertical space tight. */
export const GRADIENT_HEIGHT = 72;
export const AVATAR_SIZE = 104;
/** Half the avatar sits below the gradient; use for card overlap + padding. */
export const AVATAR_OVERLAP = AVATAR_SIZE / 2;

export default function PetHero({ imageUrl }: PetHeroProps) {
  const uri = imageUrl?.trim() || null;

  /** Total block height = gradient + lower half of avatar (for overlap into card). */
  const blockHeight = GRADIENT_HEIGHT + AVATAR_OVERLAP;

  return (
    <View style={[styles.wrapper, { height: blockHeight }]}>
      <View style={[styles.gradient, { height: GRADIENT_HEIGHT }]}>
        <View style={styles.bgOuter} />
        <View style={styles.bgInner} />
        <View style={[styles.deco, styles.decoTopRight]} />
        <View style={[styles.deco, styles.decoBottomLeft]} />
      </View>

      <View
        style={[styles.avatarContainer, { bottom: 0 }]}
        pointerEvents="box-none"
      >
        <View style={styles.avatarRing}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Svg width={48} height={48} viewBox="0 0 100 100">
                <Ellipse
                  cx="50"
                  cy="62"
                  rx="22"
                  ry="18"
                  fill="rgba(252,141,44,0.4)"
                />
                <Ellipse
                  cx="28"
                  cy="44"
                  rx="9"
                  ry="11"
                  fill="rgba(252,141,44,0.3)"
                />
                <Ellipse
                  cx="41"
                  cy="36"
                  rx="9"
                  ry="11"
                  fill="rgba(252,141,44,0.3)"
                />
                <Ellipse
                  cx="59"
                  cy="36"
                  rx="9"
                  ry="11"
                  fill="rgba(252,141,44,0.3)"
                />
                <Ellipse
                  cx="72"
                  cy="44"
                  rx="9"
                  ry="11"
                  fill="rgba(252,141,44,0.3)"
                />
              </Svg>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  gradient: {
    width: "100%",
    backgroundColor: Colors.orange,
    overflow: "hidden",
  },
  bgOuter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.amber,
    opacity: 0.4,
  },
  bgInner: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: Colors.orangeDark,
    opacity: 0.2,
  },
  deco: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  decoTopRight: {
    width: 90,
    height: 90,
    top: -28,
    right: -24,
  },
  decoBottomLeft: {
    width: 64,
    height: 64,
    bottom: 8,
    left: -16,
  },
  avatarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    borderColor: Colors.white,
    backgroundColor: Colors.orangeLight,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
