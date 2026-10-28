import { DuplicateWeighInError } from "@/services/activities/weighIn";
import type { PetActivity } from "@/types/database";
import { Alert } from "react-native";
import { sessionGeneration } from "@/lib/sessionGeneration";

/** The first save is conflict-safe even when another device logs a reading. */
export async function saveWithWeighInConfirmation(
  save: (replaceExisting: boolean) => Promise<PetActivity>,
): Promise<PetActivity | null> {
  const generation = sessionGeneration();
  try {
    return await save(false);
  } catch (error) {
    if (!(error instanceof DuplicateWeighInError)) throw error;
    const date = new Date(`${error.recordedAt}T12:00:00`).toLocaleDateString();
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Replace this day's weigh-in?",
        `A weigh-in already exists for ${date}. Continuing will replace that day's weight and activity entry.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Continue", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    return confirmed && generation === sessionGeneration() ? save(true) : null;
  }
}
