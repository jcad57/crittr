import * as FileSystem from "expo-file-system/legacy";

export function medicalRecordPreviewCacheDirectory(): string {
  if (!FileSystem.cacheDirectory)
    throw new Error("Device cache is unavailable.");
  return `${FileSystem.cacheDirectory}medical-record-previews/`;
}

export async function clearMedicalRecordPreviewCache(): Promise<void> {
  await FileSystem.deleteAsync(medicalRecordPreviewCacheDirectory(), {
    idempotent: true,
  });
}

/** Keep exported copies briefly for receiving apps, then bound cache growth. */
export async function pruneMedicalRecordPreviewCache(): Promise<void> {
  const root = medicalRecordPreviewCacheDirectory();
  const info = await FileSystem.getInfoAsync(root);
  if (!info.exists) return;
  const entries = await FileSystem.readDirectoryAsync(root);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    const timestamp = Number(entry.split("-")[0]);
    if (timestamp > 0 && timestamp < cutoff) {
      await FileSystem.deleteAsync(`${root}${entry}`, { idempotent: true });
    }
  }
}
