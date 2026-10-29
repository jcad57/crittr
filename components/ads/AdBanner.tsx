import { AdUnitIds, ENABLED_AD_PLACEMENTS, type AdPlacement } from "@/config/ads";
import { createThemeValues, useThemeValues } from "@/theme/colors";
import { useCanShowAds } from "@/hooks/useCanShowAds";
import { useTrackingConsent } from "@/hooks/useTrackingConsent";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
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
 * Google AdMob banner for eligible Free-tier users:
 * signed-in, non–Crittr Pro, finished onboarding, logged-in shell.
 *
 * Renders nothing for:
 * - Signed-out users and anyone still on auth / password reset
 * - Pro members
 * - Users whose profile hasn't been fetched yet (avoids a flash of an ad before we know)
 * - Placements toggled off in `ENABLED_AD_PLACEMENTS`
 * - Failed ad loads (collapses the slot instead of leaving empty chrome)
 *
 * Adaptive banners use the measured slot width so screen padding never clips the ad.
 */
export default function AdBanner({ placement, style, size }: AdBannerProps) {
  const styles = useThemeValues(getStyles);
  const canShowAds = useCanShowAds();
  const { personalizedAds } = useTrackingConsent();
  const [failed, setFailed] = useState(false);
  const [bannerWidth, setBannerWidth] = useState(0);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setBannerWidth(Math.max(0, Math.floor(event.nativeEvent.layout.width - 2)));
  }, []);

  const handleError = useCallback((error: unknown) => {
    if (__DEV__) {
      console.warn(`[AdBanner:${placement}] failed to load`, error);
    }
    setFailed(true);
  }, [placement]);

  const handleLoaded = useCallback(() => {
    setFailed(false);
  }, []);

  const requestOptions = useMemo(
    () => ({ requestNonPersonalizedAdsOnly: !personalizedAds }),
    [personalizedAds],
  );

  if (!ENABLED_AD_PLACEMENTS[placement]) return null;
  if (!canShowAds) return null;
  if (failed) return null;

  return (
    <View style={[styles.wrap, style]} onLayout={handleLayout}>
      {bannerWidth > 0 && (
        <BannerAd
          unitId={AdUnitIds.banner[placement]}
          width={bannerWidth}
          size={size ?? BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={requestOptions}
          onAdLoaded={handleLoaded}
          onAdFailedToLoad={handleError}
        />
      )}
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
}));
