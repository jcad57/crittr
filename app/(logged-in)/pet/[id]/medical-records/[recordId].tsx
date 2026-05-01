import MedicalRecordAddFilesModal, {
  type PendingMedicalFile,
} from "@/components/medical/MedicalRecordAddFilesModal";
import MedicalRecordFilePreviewModal from "@/components/medical/MedicalRecordFilePreviewModal";
import MedicalRecordEditFilesList from "@/components/petScreens/medicalRecords/MedicalRecordEditFilesList";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import {
  useDeleteMedicalRecordFileMutation,
  useDeletePetMedicalRecordMutation,
  usePetDetailsQuery,
  usePetMedicalRecordDetailQuery,
  useUpdatePetMedicalRecordTitleMutation,
  useUploadMedicalRecordFileMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { styles } from "@/screen-styles/pet/[id]/medical-records/[recordId].styles";
import {
  downloadMedicalRecordFileForOpening,
  shareMedicalRecordFile,
} from "@/services/petMedicalRecords";
import { useAuthStore } from "@/stores/authStore";
import type { PetMedicalRecordFile } from "@/types/database";
import { getErrorMessage } from "@/utils/errorMessage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EditMedicalRecordScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const { replace, router } = useNavigationCooldown();
  const userId = useAuthStore((s) => s.session?.user?.id);

  // const onPetSwitch = usePetScopedAfterSwitchPet(petId, replace);

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
  const [filePreviewUri, setFilePreviewUri] = useState<string | null>(null);
  const [filePreviewMime, setFilePreviewMime] = useState<string | null>(null);
  const [filePreviewLoading, setFilePreviewLoading] = useState(false);
  const [sharingFileId, setSharingFileId] = useState<string | null>(null);

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
    setFilePreviewLoading(true);
    setFilePreviewUri(null);
    setFilePreviewMime(file.mime_type ?? null);
    try {
      const localUri = await downloadMedicalRecordFileForOpening(file);
      setFilePreviewUri(localUri);
    } catch (e) {
      setFilePreviewMime(null);
      Alert.alert(
        "Could not open file",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    } finally {
      setFilePreviewLoading(false);
    }
  }, []);

  const closeFilePreview = useCallback(() => {
    setFilePreviewUri(null);
    setFilePreviewMime(null);
    setFilePreviewLoading(false);
  }, []);

  const handleShareFile = useCallback(async (file: PetMedicalRecordFile) => {
    setSharingFileId(file.id);
    try {
      await shareMedicalRecordFile(file);
    } catch (e) {
      Alert.alert(
        "Could not share",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    } finally {
      setSharingFileId(null);
    }
  }, []);

  const confirmDeleteFile = useCallback(
    (file: PetMedicalRecordFile) => {
      Alert.alert("Remove this file?", file.original_filename ?? "File", [
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
      ]);
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

  const titleDirty = titleDraft.trim() !== (record?.title ?? "").trim();
  const canSaveTitle = canEdit && titleDraft.trim().length > 0 && titleDirty;

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
              // onAfterSwitchPet={onPetSwitch}
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
                  onPress={() => runWithProOrUpgrade(() => setAddOpen(true))}
                  hitSlop={8}
                >
                  <Text style={styles.addLink}>Add files</Text>
                </Pressable>
              ) : null}
            </View>

            <MedicalRecordEditFilesList
              files={files}
              canEdit={canEdit}
              openFile={openFile}
              confirmDeleteFile={confirmDeleteFile}
              onShareFile={handleShareFile}
              sharingFileId={sharingFileId}
            />
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

      <MedicalRecordFilePreviewModal
        visible={filePreviewLoading || filePreviewUri !== null}
        loading={filePreviewLoading}
        localUri={filePreviewUri}
        mimeType={filePreviewMime}
        onClose={closeFilePreview}
      />

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
