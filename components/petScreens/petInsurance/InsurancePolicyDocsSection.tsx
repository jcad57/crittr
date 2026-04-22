import { Colors } from "@/constants/colors";
import type { PetInsuranceFile } from "@/types/database";
import { formatBytes, mimeKind } from "@/utils/fileAttachmentDisplay";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { styles } from "@/screen-styles/pet/[id]/insurance.styles";

type Props = {
  files: PetInsuranceFile[];
  filesLoading: boolean;
  policyDocsUploading: boolean;
  deletingFileId: string | null;
  busy: boolean;
  onAddFile: () => void;
  openFile: (f: PetInsuranceFile) => void;
  confirmDeleteFile: (f: PetInsuranceFile) => void;
};

export default function InsurancePolicyDocsSection({
  files,
  filesLoading,
  policyDocsUploading,
  deletingFileId,
  busy,
  onAddFile,
  openFile,
  confirmDeleteFile,
}: Props) {
  return (
    <>
      <View style={styles.policyDocsHeader}>
        <Text style={styles.sectionTitle}>Policy documents</Text>
        <Text style={styles.policyDocsHelper}>
          Add PDFs or photos of your policy documents.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.addFileBtn,
            pressed && styles.addFileBtnPressed,
            busy && styles.addFileBtnDisabled,
          ]}
          onPress={onAddFile}
          disabled={busy}
        >
          <MaterialCommunityIcons
            name="plus-circle-outline"
            size={22}
            color={Colors.orange}
          />
          <Text style={styles.addFileBtnText}>Add file</Text>
        </Pressable>
      </View>

      {filesLoading ? (
        <View style={styles.paddedCenter}>
          <ActivityIndicator color={Colors.orange} />
          <Text style={styles.loadingDocsHint}>
            Loading documents…
          </Text>
        </View>
      ) : (
        <>
          {policyDocsUploading ? (
            <View style={styles.policyDocsLoadingBanner}>
              <ActivityIndicator size="small" color={Colors.orange} />
              <Text style={styles.policyDocsLoadingText}>
                Uploading…
              </Text>
            </View>
          ) : null}
          {files.length > 0 ? (
            <View
              style={[
                styles.fileList,
                policyDocsUploading && styles.fileListMuted,
              ]}
            >
              {files.map((f, i) => (
                <View key={f.id} style={styles.fileRowWrap}>
                  <Pressable
                    style={[
                      styles.fileRow,
                      i < files.length - 1 && styles.fileRowBorder,
                    ]}
                    onPress={() => void openFile(f)}
                    disabled={policyDocsUploading}
                  >
                    <View
                      style={[
                        styles.fileIcon,
                        mimeKind(f.mime_type) === "pdf" &&
                          styles.fileIconPdf,
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
                        {new Date(f.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
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
                  {deletingFileId === f.id ? (
                    <View
                      style={styles.trashBtn}
                      accessibilityState={{ busy: true }}
                      accessibilityLabel="Removing file"
                    >
                      <ActivityIndicator
                        size="small"
                        color={Colors.orange}
                      />
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => confirmDeleteFile(f)}
                      hitSlop={10}
                      style={styles.trashBtn}
                      disabled={busy}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color={Colors.gray500}
                      />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </>
  );
}
