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
 * Pick one or more images from the library. The system picker on iOS/Android
 * supports tapping multiple photos in the same sheet; callers should treat the
 * return value as a list (even when the user selected just one).
 *
 * `selectionLimit: 0` means "unlimited" on both platforms; we leave it
 * uncapped so users can attach a full set of vet paperwork in a single pass.
 *
 * Guards against two native edge cases that would otherwise silently drop a
 * valid selection:
 * - iOS PHPicker can deliver `assets` as an empty array with `canceled:false`
 *   when the user swipes the sheet down mid-selection on certain iOS builds.
 * - Android's `PickMultipleVisualMedia` returns a single-URI selection via
 *   `intent.data` rather than `clipData`; the JS payload shape is the same,
 *   but historically early expo-image-picker builds surfaced that as an
 *   empty `assets` list.
 * We defensively treat an empty array from a non-canceled result as "nothing
 * picked" so callers never see an unhandled exception.
 */
export async function pickMedicalPhotosFromLibrary(): Promise<
  PickedMedicalAsset[]
> {
  const ok = await ensurePhotoLibraryPermission();
  if (!ok) return [];

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.88,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      orderedSelection: true,
    });
  } catch (e) {
    if (__DEV__) console.warn("[pickMedicalPhotosFromLibrary]", e);
    return [];
  }

  if (result.canceled) return [];
  const assets = Array.isArray(result.assets) ? result.assets : [];
  if (assets.length === 0) return [];

  return assets.map((asset, idx) => {
    const name =
      asset.fileName ??
      `medical_${Date.now()}${assets.length > 1 ? `_${idx + 1}` : ""}.jpg`;
    return {
      uri: asset.uri,
      name,
      mimeType: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize ?? null,
    };
  });
}

/**
 * @deprecated Prefer `pickMedicalPhotosFromLibrary` to let users attach multiple
 * photos in a single trip to the picker. Retained so existing single-photo call
 * sites keep working during the transition.
 */
export async function pickMedicalPhotoFromLibrary(): Promise<PickedMedicalAsset | null> {
  const assets = await pickMedicalPhotosFromLibrary();
  return assets[0] ?? null;
}

/**
 * Pick one or more documents (PDF, images, etc.) from the system file picker.
 *
 * Notes:
 * - We pass one catch-all MIME string (see getDocumentAsync `type` below)
 *   instead of stacking several wildcards. Android SAF can behave oddly when
 *   multiple wildcard MIME filters are combined; some OEM builds return a
 *   single pick only on intent.data with null clipData, which older picker
 *   paths surfaced as an empty assets array.
 * - Non-PDF / non-image files are fine to attach; the parse-medical-record
 *   edge function validates and skips unsupported types with a warning.
 */
export async function pickMedicalDocuments(): Promise<PickedMedicalAsset[]> {
  let result: Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: "*/*",
      /** `true` copies every file on the native side before the promise resolves,
       *  which freezes the UI after the user taps OK in SAF. Upload uses
       *  `ensureLocalFileUri` anyway, so we defer copy until Create/upload. */
      copyToCacheDirectory: false,
      multiple: true,
    });
  } catch (e) {
    if (__DEV__) console.warn("[pickMedicalDocuments]", e);
    return [];
  }

  if (result.canceled) return [];
  const assets = Array.isArray(result.assets) ? result.assets : [];
  if (assets.length === 0) return [];

  return assets.map((a) => ({
    uri: a.uri,
    name: a.name ?? "document",
    mimeType: a.mimeType ?? null,
    size: a.size ?? null,
  }));
}
