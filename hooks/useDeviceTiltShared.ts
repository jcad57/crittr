import { Accelerometer, DeviceMotion } from "expo-sensors";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

/** ~25° tilt → full normalized deflection (radians). */
const TILT_SENS_RAD = 0.44;

function tiltFromGravityVector(x: number, y: number, z: number): {
  gx: number;
  gy: number;
} {
  const roll = Math.atan2(y, z);
  const pitch = Math.atan2(-x, Math.sqrt(y * y + z * z));
  return {
    gx: Math.max(-1, Math.min(1, roll / (Math.PI / 4))),
    gy: Math.max(-1, Math.min(1, pitch / (Math.PI / 4))),
  };
}

export type DeviceTiltShared = {
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
};

/**
 * Smoothed device tilt as Reanimated shared values (–1…1).
 * Uses DeviceMotion rotation when available, else accelerometer-derived pitch/roll.
 */
export function useDeviceTiltShared(enabled: boolean): DeviceTiltShared {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    if (!enabled || Platform.OS === "web") {
      return;
    }

    let subscription: { remove: () => void } | undefined;

    const start = async () => {
      const motionOk = await DeviceMotion.isAvailableAsync();
      if (motionOk) {
        DeviceMotion.setUpdateInterval(16);
        subscription = DeviceMotion.addListener((event) => {
          // Android (especially emulators) often omits `rotation` until the rotation-vector
          // sensor has produced a reading; use gravity vector when needed (native module
          // only sends accelerationIncludingGravity once accel + gravity sensors align).
          const rot = event.rotation;
          let gx = 0;
          let gy = 0;

          if (
            rot &&
            typeof rot.gamma === "number" &&
            typeof rot.beta === "number"
          ) {
            gx = Math.max(-1, Math.min(1, rot.gamma / TILT_SENS_RAD));
            gy = Math.max(-1, Math.min(1, rot.beta / TILT_SENS_RAD));
          } else {
            const g = event.accelerationIncludingGravity;
            if (
              g &&
              typeof g.x === "number" &&
              typeof g.y === "number" &&
              typeof g.z === "number"
            ) {
              const t = tiltFromGravityVector(g.x, g.y, g.z);
              gx = t.gx;
              gy = t.gy;
            } else {
              return;
            }
          }

          tiltX.value = tiltX.value * 0.78 + gx * 0.22;
          tiltY.value = tiltY.value * 0.78 + gy * 0.22;
        });
        return;
      }

      const accelOk = await Accelerometer.isAvailableAsync();
      if (!accelOk) return;

      Accelerometer.setUpdateInterval(16);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const { gx, gy } = tiltFromGravityVector(x, y, z);
        tiltX.value = tiltX.value * 0.78 + gx * 0.22;
        tiltY.value = tiltY.value * 0.78 + gy * 0.22;
      });
    };

    void start();
    return () => subscription?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable
  }, [enabled]);

  return { tiltX, tiltY };
}
