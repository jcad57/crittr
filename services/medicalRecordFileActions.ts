import { File, FileMode } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import {
  medicalRecordContentType,
  medicalRecordFileName,
} from "@/utils/medicalRecordFiles";

export async function shareLocalMedicalRecord(
  localUri: string,
  mimeType?: string | null,
  saving = false,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn’t available on this device.");
  }
  await Sharing.shareAsync(localUri, {
    mimeType: mimeType || undefined,
    dialogTitle: saving ? "Save document" : "Share document",
  });
}

/** iOS exposes Save to Files in its system sheet; Android lets the user choose a folder. */
export async function saveLocalMedicalRecord(
  localUri: string,
  filename: string,
  mimeType?: string | null,
): Promise<boolean> {
  if (Platform.OS !== "android") {
    await shareLocalMedicalRecord(localUri, mimeType, true);
    // The iOS sheet does not report whether the user saved or cancelled.
    return false;
  }
  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return false;
  const type = medicalRecordContentType(filename, mimeType);
  const name = medicalRecordFileName(filename, type);
  const destination = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    name,
    type,
  );
  try {
    // Write the newly created SAF document without deleting/recreating its URI.
    // Bounded chunks avoid loading a full base64 document into JS memory.
    const source = new File(localUri).open(FileMode.ReadOnly);
    let target: ReturnType<File["open"]> | undefined;
    try {
      target = new File(destination).open(FileMode.WriteOnly);
      for (;;) {
        const chunk = await source.readBytes(256 * 1024);
        if (chunk.length === 0) break;
        await target.writeBytes(chunk);
      }
    } finally {
      source.close();
      target?.close();
    }
    return true;
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(
      () => {},
    );
    throw error;
  }
}

export async function openLocalMedicalRecord(
  localUri: string,
  filename: string,
  mimeType?: string | null,
): Promise<void> {
  const file = new File(localUri);
  const options = {
    title: filename,
    mimeType: medicalRecordContentType(filename, mimeType),
  };
  if (!(await file.canPreview(options))) {
    throw new Error(
      "No app on this device can open this file. You can save it or share it with another device.",
    );
  }
  await file.preview(options);
}
