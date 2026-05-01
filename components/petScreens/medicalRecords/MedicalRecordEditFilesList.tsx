import { Colors } from "@/constants/colors";
import type { PetMedicalRecordFile } from "@/types/database";
import { formatBytes, mimeKind } from "@/utils/fileAttachmentDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "@/screen-styles/pet/[id]/medical-records/[recordId].styles";

type Props = {
  files: PetMedicalRecordFile[];
  canEdit: boolean;
  openFile: (file: PetMedicalRecordFile) => void;
  confirmDeleteFile: (file: PetMedicalRecordFile) => void;
  onShareFile: (file: PetMedicalRecordFile) => void;
  /** While non-null, disables actions for the matching row and shows a spinner on Share */
  sharingFileId?: string | null;
};

export default function MedicalRecordEditFilesList({
  files,
  canEdit,
  openFile,
  confirmDeleteFile,
  onShareFile,
  sharingFileId,
}: Props) {
  if (files.length === 0) {
    return (
      <Text style={styles.emptyFiles}>
        No files yet.
        {canEdit ? " Tap Add files to upload." : ""}
      </Text>
    );
  }

  return (
    <View style={styles.fileList}>
      {files.map((f) => {
        const rowBusy = sharingFileId === f.id;

        return (
          <View key={f.id} style={styles.fileRow}>
            <Pressable
              style={styles.fileMain}
              onPress={() => void openFile(f)}
            >
              <View
                style={[
                  styles.fileIcon,
                  mimeKind(f.mime_type) === "pdf" && styles.fileIconPdf,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    mimeKind(f.mime_type) === "pdf"
                      ? "file-pdf-box"
                      : "image-outline"
                  }
                  size={22}
                  color={
                    mimeKind(f.mime_type) === "pdf"
                      ? Colors.orange
                      : Colors.skyDark
                  }
                />
              </View>
              <View style={styles.fileMid}>
                <Text style={styles.fileName} numberOfLines={2}>
                  {f.original_filename ?? "File"}
                </Text>
                <Text style={styles.fileMeta}>
                  {new Date(f.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {formatBytes(f.file_size_bytes)
                    ? ` · ${formatBytes(f.file_size_bytes)}`
                    : ""}
                </Text>
              </View>
            </Pressable>

            <View style={styles.fileActions}>
              <Pressable
                onPress={() => void onShareFile(f)}
                hitSlop={8}
                disabled={rowBusy}
                accessibilityRole="button"
                accessibilityLabel="Share or save document"
                style={({ pressed }) => [
                  styles.fileActionBtn,
                  pressed && !rowBusy && styles.fileActionBtnPressed,
                  rowBusy && styles.fileActionBtnDisabled,
                ]}
              >
                {rowBusy ? (
                  <ActivityIndicator size="small" color={Colors.orange} />
                ) : (
                  <MaterialCommunityIcons
                    name="export"
                    size={22}
                    color={Colors.orange}
                  />
                )}
              </Pressable>
              {canEdit ? (
                <Pressable
                  onPress={() => confirmDeleteFile(f)}
                  hitSlop={10}
                  disabled={rowBusy}
                  accessibilityRole="button"
                  accessibilityLabel="Remove file"
                  style={({ pressed }) => [
                    styles.fileActionBtn,
                    pressed && !rowBusy && styles.fileActionBtnPressed,
                    rowBusy && styles.fileActionBtnDisabled,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={22}
                    color={Colors.gray500}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
