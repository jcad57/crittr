import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

/**
 * Ensures the user has granted access to the photo library (for avatar picks).
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status: existing } =
    await ImagePicker.getMediaLibraryPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo access needed",
      "Allow access to your photos to choose an avatar.",
    );
    return false;
  }
  return true;
}

/**
 * Opens the image library for a square crop suitable for avatars.
 * Returns a local `file://` URI, or `null` if cancelled or denied.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const ok = await ensureMediaLibraryPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
