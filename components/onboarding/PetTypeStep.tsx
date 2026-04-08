import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { authOnboardingStyles } from "@/constants/authOnboardingStyles";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { usePetFlowExitOnBack } from "@/hooks/usePetFlowExitOnBack";
import {
  PET_TYPE_ICON_MAP,
  PET_TYPE_OPTIONS,
} from "@/constants/petTypeIcons";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { useReferenceStore } from "@/stores/referenceStore";
import type { PetType } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function PetTypeStep() {
  const {
    pets,
    currentPetIndex,
    updateCurrentPet,
    nextStep,
    addingAnotherPet,
    cancelAddAnotherPet,
  } = useOnboardingStore();
  const handleBack = usePetFlowExitOnBack();
  const fetchForPetType = useReferenceStore((s) => s.fetchForPetType);
  const pet = pets[currentPetIndex];
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const handleSelect = (type: PetType) => {
    updateCurrentPet({ petType: type });
    fetchForPetType(type);
  };

  const handleContinue = () => {
    if (!pet.petType) {
      setAttempted(true);
      Alert.alert(
        "Select a pet type",
        "Please choose a pet type before you can continue.",
      );
      return;
    }
    nextStep();
  };

  const typeMissing = attempted && !pet.petType;

  return (
    <View style={styles.container}>
      <Text style={[authOnboardingStyles.screenTitle, { marginBottom: 8 }]}>
        What type of pet do you have?
      </Text>
      <Text style={[authOnboardingStyles.screenSubtitle, { marginBottom: 28 }]}>
        This helps us tailor the experience for your pet. You&apos;ll be able to
        add more pets later.
      </Text>

      <Text style={[styles.fieldLabel, typeMissing && styles.fieldLabelError]}>
        Pet type *
      </Text>
      <View style={[styles.grid, typeMissing && styles.gridError]}>
        {PET_TYPE_OPTIONS.map((pt) => {
          const isActive = pet.petType === pt.id;
          return (
            <Pressable
              key={pt.id}
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => handleSelect(pt.id)}
            >
              <View
                style={[styles.iconCircle, isActive && styles.iconCircleActive]}
              >
                <MaterialCommunityIcons
                  name={PET_TYPE_ICON_MAP[pt.id]}
                  size={28}
                  color={isActive ? Colors.orange : Colors.gray400}
                />
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {pt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <OrangeButton onPress={handleContinue} style={styles.cta}>
        Continue
      </OrangeButton>

      {addingAnotherPet ? (
        <Pressable
          onPress={cancelAddAnotherPet}
          style={styles.cancelRow}
          hitSlop={8}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      ) : null}

      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Text style={authOnboardingStyles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelError: {
    color: Colors.error,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    padding: 4,
  },
  gridError: {
    borderWidth: 1.5,
    borderColor: Colors.error,
  },
  card: {
    width: "47%",
    alignItems: "center",
    paddingVertical: 20,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    borderRadius: 16,
    gap: 8,
  },
  cardActive: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeLight,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: {
    backgroundColor: Colors.white,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  labelActive: {
    fontFamily: Font.uiBold,
    color: Colors.orange,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  cta: {
    marginTop: 12,
  },
  cancelRow: {
    alignSelf: "center",
    paddingVertical: 12,
  },
  cancelText: {
    fontFamily: Font.uiBold,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  backButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },
});
