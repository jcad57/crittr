import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

export function useScanRecordSheetAnimation(
  visible: boolean,
  sheetMaxHeight: number,
) {
  const [mounted, setMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(sheetMaxHeight)).current;
  const wasShownRef = useRef(false);

  useEffect(() => {
    if (visible) {
      wasShownRef.current = true;
      setMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(sheetMaxHeight);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    if (!wasShownRef.current) return;
    wasShownRef.current = false;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: sheetMaxHeight,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, backdropOpacity, sheetTranslateY, sheetMaxHeight]);

  return { mounted, backdropOpacity, sheetTranslateY };
}
