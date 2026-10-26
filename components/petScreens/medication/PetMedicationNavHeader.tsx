import ScreenHeader from "@/components/ui/ScreenHeader";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import type { Pet } from "@/types/database";

type Props = {
  title: string;
  onBack: () => void;
  displayPet?: Pet | null;
  accessibilityLabelPrefix?: string;
  showAvatar?: boolean;
  onAfterSwitchPet?: (newPetId: string) => void;
};

export default function PetMedicationNavHeader({
  title,
  onBack,
  displayPet,
  accessibilityLabelPrefix,
  showAvatar = true,
  onAfterSwitchPet,
}: Props) {
  return (
    <ScreenHeader
      title={title}
      onBack={onBack}
      titleLines={2}
      right={
        showAvatar && displayPet ? (
          <PetNavAvatar
            displayPet={displayPet}
            accessibilityLabelPrefix={accessibilityLabelPrefix}
            onAfterSwitchPet={onAfterSwitchPet}
          />
        ) : null
      }
    />
  );
}
