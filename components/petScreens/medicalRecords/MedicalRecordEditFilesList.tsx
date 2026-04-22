import { Colors } from "@/constants/colors";
import type { PetMedicalRecordFile } from "@/types/database";
import { formatBytes, mimeKind } from "@/utils/fileAttachmentDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { styles } from "@/screen-styles/pet/[id]/medical-records/[recordId].styles";

type Props = {
  files: PetMedicalRecordFile[];
  canEdit: boolean;
  openFile: (file: PetMedicalRecordFile) => void;
  confirmDeleteFile: (file: PetMedicalRecordFile) => void;
};

export default function MedicalRecordEditFilesList({
  files,
  canEdit,
  openFile,
  confirmDeleteFile,
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
      {files.map((f) => (
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
            <MaterialCommunityIcons
              name="open-in-new"
              size={20}
              color={Colors.gray400}
            />
          </Pressable>
          {canEdit ? (
            <Pressable
              onPress={() => confirmDeleteFile(f)}
              hitSlop={10}
              style={styles.trashBtn}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={22}
                color={Colors.gray500}
              />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}
