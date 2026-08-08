import ScreenHeader from "@/components/ui/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  onBack: () => void;
};

export default function PetProfileNavBar({ title, onBack }: Props) {
  const insets = useSafeAreaInsets();
  return <ScreenHeader title={title} onBack={onBack} topInset={insets.top + 4} />;
}
