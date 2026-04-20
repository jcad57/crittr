import { AdUnitIds, ENABLED_AD_PLACEMENTS, type AdPlacement } from "@/constants/ads";
import { Colors } from "@/constants/colors";
import { useProfileQuery } from "@/hooks/queries";
import { useIsCrittrPro } from "@/hooks/useIsCrittrPro";
import { useCallback, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  type BannerAdProps,
} from "react-native-google-mobile-ads";

type AdBannerProps = {
  /** Semantic slot key — lets us toggle individual placements via `ENABLED_AD_PLACEMENTS`. */
  placement: AdPlacement;
  /** Optional wrapper overrides for layout-specific spacing. */
  style?: StyleProp<ViewStyle>;
  /** Override the default adaptive banner size if a slot needs a fixed format. */
  size?: BannerAdProps["size"];
};

/**
 * Google AdMob banner gated by Crittr Pro status.
 *
 * Renders nothing for:
 * - Pro members (canonical check via `useIsCrittrPro` + profile query)
 * - Users whose profile hasn't been fetched yet (avoids a flash of an ad before we know)
 * - Placements toggled off in `ENABLED_AD_PLACEMENTS`
 * - Failed ad loads (collapses the slot instead of leaving empty chrome)
 *
 * Uses `ANCHORED_ADAPTIVE_BANNER` so the banner height matches the device width — the
 * current AdMob best practice for in-feed banners.
 */
export default function AdBanner({ placement, style, size }: AdBannerProps) {
  const { data: profile, isPlaceholderData, isPending } = useProfileQuery();
  const isPro = useIsCrittrPro(profile);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback((error: unknown) => {
    if (__DEV__) {
      console.warn(`[AdBanner:${placement}] failed to load`, error);
    }
    setFailed(true);
  }, [placement]);

  const handleLoaded = useCallback(() => {
    setFailed(false);
  }, []);

  if (!ENABLED_AD_PLACEMENTS[placement]) return null;
  if (isPro) return null;
  /** Wait for the first real profile fetch so Pro users never briefly see an ad. */
  if (isPending || isPlaceholderData) return null;
  if (failed) return null;

  return (
    <View style={[styles.wrap, style]}>
      <BannerAd
        unitId={AdUnitIds.banner}
        size={size ?? BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: false,
        }}
        onAdLoaded={handleLoaded}
        onAdFailedToLoad={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
});
