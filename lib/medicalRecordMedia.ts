import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export type PickedMedicalAsset = {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
};

/**
 * Requests camera permission and explains why if denied.
 */
export async function ensureCameraPermission(): Promise<boolean> {
  const { status: existing } = await ImagePicker.getCameraPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera access needed",
      "Allow Crittr to use your camera to photograph medical documents for this pet.",
    );
    return false;
  }
  return true;
}

/**
 * Photo library — for choosing existing photos as document scans.
 */
export async function ensurePhotoLibraryPermission(): Promise<boolean> {
  const { status: existing } =
    await ImagePicker.getMediaLibraryPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Photo library access needed",
      "Allow access to your photos to add pictures of medical documents.",
    );
    return false;
  }
  return true;
}

/**
 * Opens the camera to capture one image. Returns null if cancelled or denied.
 */
export async function captureMedicalPhoto(): Promise<PickedMedicalAsset | null> {
  const ok = await ensureCameraPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.88,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name =
    asset.fileName ??
    `medical_${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? "image/jpeg",
    size: asset.fileSize ?? null,
  };
}

/**
 * Pick one image from the library (e.g. additional page scans).
 */
export async function pickMedicalPhotoFromLibrary(): Promise<PickedMedicalAsset | null> {
  const ok = await ensurePhotoLibraryPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.88,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const name = asset.fileName ?? `medical_${Date.now()}.jpg`;
  return {
    uri: asset.uri,
    name,
    mimeType: asset.mimeType ?? "image/jpeg",
    size: asset.fileSize ?? null,
  };
}

/**
 * Pick one or more documents (PDF, images, etc.) from the system file picker.
 */
export async function pickMedicalDocuments(): Promise<PickedMedicalAsset[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*", "*/*"],
    copyToCacheDirectory: true,
    multiple: true,
  });

  if (result.canceled) return [];

  return result.assets.map((a) => ({
    uri: a.uri,
    name: a.name ?? "document",
    mimeType: a.mimeType ?? null,
    size: a.size ?? null,
  }));
}
