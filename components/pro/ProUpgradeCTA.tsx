import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { useProUpgradeCta } from "@/hooks/useProUpgradeCta";
import type { ProBillingParam } from "@/lib/iap/checkout";
import type { GestureResponderEvent, StyleProp, ViewStyle } from "react-native";

type Props = {
  onPress?: ((e: GestureResponderEvent) => void) | null;
  style?: StyleProp<ViewStyle>;
  billing?: ProBillingParam;
  disabled?: boolean;
  loading?: boolean;
};

/** Primary Pro upgrade button with store-backed trial eligibility copy. */
export function ProUpgradeCTA({
  onPress,
  style,
  billing = "annual",
  disabled,
  loading,
}: Props) {
  const { label, accessibilityLabel } = useProUpgradeCta(billing);
  return (
    <OrangeButton
      onPress={onPress}
      style={style}
      disabled={disabled}
      loading={loading}
      accessibilityLabel={accessibilityLabel}
    >
      {label}
    </OrangeButton>
  );
}
