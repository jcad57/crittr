import MedicalRecordAddFilesModal, {
  type PendingMedicalFile,
} from "@/components/medical/MedicalRecordAddFilesModal";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
import {
  useDeleteMedicalRecordFileMutation,
  useDeletePetMedicalRecordMutation,
  usePetDetailsQuery,
  usePetMedicalRecordDetailQuery,
  useUpdatePetMedicalRecordTitleMutation,
  useUploadMedicalRecordFileMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { getErrorMessage } from "@/lib/errorMessage";
import { createSignedMedicalRecordUrl } from "@/services/petMedicalRecords";
import { useAuthStore } from "@/stores/authStore";
import type { PetMedicalRecordFile } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatBytes(n: number | null): string {
  if (n == null || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024)
    return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeKind(mime: string | null): "pdf" | "image" {
  if (!mime) return "image";
  if (mime === "application/pdf" || mime.includes("pdf")) return "pdf";
  return "image";
}

export default function EditMedicalRecordScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const router = useRouter();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const { id: rawPetId, recordId: rawRecordId } = useLocalSearchParams<{
    id: string;
    recordId: string;
  }>();
  const petId = Array.isArray(rawPetId) ? rawPetId[0] : rawPetId;
  const recordId = Array.isArray(rawRecordId) ? rawRecordId[0] : rawRecordId;

  const { data: details } = usePetDetailsQuery(petId);
  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = usePetMedicalRecordDetailQuery(recordId);

  const canManage = useCanPerformAction(petId, "can_manage_pet_records");
  const { runWithProOrUpgrade } = useProGateNavigation();

  const updateTitleMut = useUpdatePetMedicalRecordTitleMutation(petId ?? "");
  const deleteRecordMut = useDeletePetMedicalRecordMutation(petId ?? "");
  const uploadFileMut = useUploadMedicalRecordFileMutation(
    petId ?? "",
    recordId ?? "",
  );
  const deleteFileMut = useDeleteMedicalRecordFileMutation(
    petId ?? "",
    recordId ?? "",
  );

  const [titleDraft, setTitleDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const record = detail?.record;
  const files = detail?.files ?? [];

  useEffect(() => {
    if (record) setTitleDraft(record.title);
  }, [record]);

  useEffect(() => {
    if (record && petId && record.pet_id !== petId) {
      router.back();
    }
  }, [record, petId, router]);

  const openFile = useCallback(async (file: PetMedicalRecordFile) => {
    try {
      const url = await createSignedMedicalRecordUrl(file.storage_path);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert(
        "Could not open file",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    }
  }, []);

  const confirmDeleteFile = useCallback(
    (file: PetMedicalRecordFile) => {
      Alert.alert(
        "Remove this file?",
        file.original_filename ?? "File",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              deleteFileMut.mutate(file, {
                onError: (e) =>
                  Alert.alert("Couldn't remove file", getErrorMessage(e)),
              });
            },
          },
        ],
      );
    },
    [deleteFileMut],
  );

  const confirmDeleteRecord = useCallback(() => {
    if (!recordId) return;
    Alert.alert(
      "Delete this medical record?",
      "All files in this record will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteRecordMut.mutate(recordId, {
              onSuccess: () => router.back(),
              onError: (e) =>
                Alert.alert("Couldn't delete", getErrorMessage(e)),
            });
          },
        },
      ],
    );
  }, [deleteRecordMut, recordId, router]);

  const saveTitle = useCallback(() => {
    if (!recordId) return;
    const t = titleDraft.trim();
    if (!t) {
      Alert.alert("Title required", "Enter a name for this record.");
      return;
    }
    if (t === record?.title) return;
    updateTitleMut.mutate(
      { recordId, title: t },
      {
        onError: (e) => Alert.alert("Couldn't save", getErrorMessage(e)),
      },
    );
  }, [recordId, titleDraft, record?.title, updateTitleMut]);

  const onAddFilesSubmit = useCallback(
    async (payload: { pending: PendingMedicalFile[] }) => {
      if (!petId || !userId || !recordId) return;
      for (const p of payload.pending) {
        await uploadFileMut.mutateAsync({
          userId,
          localUri: p.asset.uri,
          originalFilename: p.asset.name,
          mimeType: p.asset.mimeType,
          fileSizeBytes: p.asset.size,
        });
      }
      setAddOpen(false);
    },
    [petId, recordId, uploadFileMut, userId],
  );

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 12;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  if (!petId || !recordId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.missing}>Invalid link.</Text>
      </View>
    );
  }

  if (isLoading || canManage === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (isError || !record) {
    return (
      <View style={[styles.centered, { paddingHorizontal: 24 }]}>
        <Text style={styles.missing}>This record could not be loaded.</Text>
        <Pressable onPress={() => refetch()} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const canEdit = canManage === true && Boolean(userId);

  const titleDirty =
    titleDraft.trim() !== (record?.title ?? "").trim();
  const canSaveTitle =
    canEdit && titleDraft.trim().length > 0 && titleDirty;

  const busy = updateTitleMut.isPending || deleteRecordMut.isPending;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          Medical record
        </Text>
        <View style={styles.navRight}>
          {details ? (
            <PetNavAvatar
              displayPet={details}
              accessibilityLabelPrefix="Medical record for"
            />
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          styles.scrollContentGrow,
          { paddingBottom: scrollInsetBottom + 32 },
        ]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.scrollInner, { minHeight: scrollContentMinHeight }]}
        >
          <View style={styles.formMain}>
            <Text style={styles.label}>Record name</Text>
            <TextInput
              style={[styles.titleInput, !canEdit && styles.inputDisabled]}
              value={titleDraft}
              onChangeText={setTitleDraft}
              editable={canEdit}
              placeholder="Title"
              placeholderTextColor={Colors.gray500}
            />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Files</Text>
              {canEdit ? (
                <Pressable
                  onPress={() =>
                    runWithProOrUpgrade(() => setAddOpen(true))
                  }
                  hitSlop={8}
                >
                  <Text style={styles.addLink}>Add files</Text>
                </Pressable>
              ) : null}
            </View>

            {files.length === 0 ? (
              <Text style={styles.emptyFiles}>
                No files yet.
                {canEdit ? " Tap Add files to upload." : ""}
              </Text>
            ) : (
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
            )}
          </View>

          {canEdit ? (
            <View style={styles.actionsBlock}>
              <OrangeButton
                onPress={saveTitle}
                loading={updateTitleMut.isPending}
                disabled={!canSaveTitle || deleteRecordMut.isPending}
                style={styles.saveBtn}
              >
                Save
              </OrangeButton>

              <Pressable
                onPress={confirmDeleteRecord}
                disabled={busy}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  pressed && styles.deleteBtnPressed,
                ]}
              >
                <Text style={styles.deleteText}>
                  {deleteRecordMut.isPending ? "Deleting…" : "Delete record"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      <MedicalRecordAddFilesModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        mode="addFiles"
        isSubmitting={uploadFileMut.isPending}
        onSubmit={async (payload) => {
          try {
            await onAddFilesSubmit(payload);
          } catch (e) {
            Alert.alert(
              "Upload failed",
              e instanceof Error ? e.message : "Please try again.",
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cream,
  },
  missing: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  retry: { marginTop: 16 },
  retryText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  navRight: { width: 44, alignItems: "center" },
  scroll: { flex: 1 },
  scrollContentGrow: {
    flexGrow: 1,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  formMain: {
    flexShrink: 0,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionsBlock: {
    paddingTop: 24,
    width: "100%",
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  titleInput: {
    fontFamily: Font.uiRegular,
    fontSize: 17,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  inputDisabled: {
    opacity: 0.85,
  },
  saveBtn: {
    marginTop: 0,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  addLink: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.orange,
  },
  emptyFiles: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  fileList: {
    gap: 0,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
    marginBottom: 0,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  fileMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 10,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.lavenderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconPdf: {
    backgroundColor: Colors.orangeLight,
  },
  fileMid: { flex: 1, minWidth: 0, gap: 4 },
  fileName: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  fileMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
  },
  trashBtn: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 14,
  },
  deleteBtnPressed: {
    opacity: 0.75,
  },
  deleteText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.error,
  },
});
