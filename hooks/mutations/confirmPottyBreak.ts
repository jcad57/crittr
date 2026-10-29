import { ActionSheetIOS, Alert, Platform } from "react-native";
import { sessionGeneration } from "@/lib/sessionGeneration";

export type PottyBreakOutcome = { pee: boolean; poo: boolean };
const prompts = new Map<string, Promise<PottyBreakOutcome | null>>();

/** A scheduled break needs an actual outcome; never infer pee/poo from a checkbox. */
export function confirmPottyBreak(itemId: string): Promise<PottyBreakOutcome | null> {
  const key = `${sessionGeneration()}:${itemId}`;
  const existing = prompts.get(key);
  if (existing) return existing;
  const result = new Promise<PottyBreakOutcome | null>((resolve) => {
    const outcomes = [{ pee: true, poo: false }, { pee: false, poo: true }, { pee: true, poo: true }];
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title: "Log potty break", message: "What did your pet do?", options: ["Pee", "Poo", "Pee & poo", "Cancel"], cancelButtonIndex: 3 }, (index) => resolve(outcomes[index] ?? null));
    } else {
      Alert.alert("Log potty break", "What did your pet do?", [
        { text: "Pee", onPress: () => resolve(outcomes[0]) },
        { text: "Poo", onPress: () => resolve(outcomes[1]) },
        { text: "Pee & poo", onPress: () => resolve(outcomes[2]) },
      ], { cancelable: true, onDismiss: () => resolve(null) });
    }
  }).finally(() => { prompts.delete(key); });
  prompts.set(key, result);
  return result;
}
