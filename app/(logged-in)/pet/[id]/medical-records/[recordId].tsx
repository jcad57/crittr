import ScreenHeader from "@/components/ui/ScreenHeader";
import MedicalRecordAddFilesModal, {
  type PendingMedicalFile,
} from "@/components/medical/MedicalRecordAddFilesModal";
import MedicalRecordFilePreviewModal from "@/components/medical/MedicalRecordFilePreviewModal";
import MedicalRecordEditFilesList from "@/components/petScreens/medicalRecords/MedicalRecordEditFilesList";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { ProSoftPaywallSheet } from "@/components/pro/ProSoftPaywallSheet";
import type { ProSoftPaywallKind } from "@/constants/proCopy";
import { Colors } from "@/theme/colors";
import {
  useDeleteMedicalRecordFileMutation,
  useDeletePetMedicalRecordMutation,
  usePetDetailsQuery,
  usePetMedicalRecordDetailQuery,
  useUpdatePetMedicalRecordTitleMutation,
  useUploadMedicalRecordFilesMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import { useNavigationCooldown } from "@/hooks/useNavigationCooldown";
import { useProGateNavigation } from "@/hooks/useProGateNavigation";
import { useMedicalRecordPreview } from "@/hooks/useMedicalRecordPreview";
import { styles } from "@/screen-styles/pet/[id]/medical-records/[recordId].styles";
import { shareMedicalRecordFile } from "@/services/petMedicalRecords";
import { useAuthStore } from "@/stores/authStore";
import type { PetMedicalRecordFile } from "@/types/database";
import { getErrorMessage } from "@/utils/errorMessage";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const { router } = useNavigationCooldown();
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
  const { isPro, runWithProOrUpgrade } = useProGateNavigation();
  const [softPaywall, setSoftPaywall] = useState<ProSoftPaywallKind | null>(
    null,
  );

  const updateTitleMut = useUpdatePetMedicalRecordTitleMutation(petId ?? "");
  const deleteRecordMut = useDeletePetMedicalRecordMutation(petId ?? "");
  const uploadFileMut = useUploadMedicalRecordFilesMutation(
    petId ?? "",
    recordId ?? "",
  );
  const deleteFileMut = useDeleteMedicalRecordFileMutation(
    petId ?? "",
    recordId ?? "",
  );

  const [titleDraft, setTitleDraft] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const upgradeAfterDismissRef = useRef(false);
  const onAddFullyDismissed = useCallback(() => {
    if (upgradeAfterDismissRef.current) {
      upgradeAfterDismissRef.current = false;
      setSoftPaywall("records");
    }
  }, []);
  const {
    preview,
    open: openFile,
    close: closeFilePreview,
  } = useMedicalRecordPreview(recordId);
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
    void runWithProOrUpgrade(
      () => {
        updateTitleMut.mutate(
          { recordId, title: t },
          {
            onError: (e) => Alert.alert("Couldn't save", getErrorMessage(e)),
          },
        );
      },
      () => setSoftPaywall("records"),
    );
  }, [
    recordId,
    titleDraft,
    record?.title,
    updateTitleMut,
    runWithProOrUpgrade,
  ]);

  const onAddFilesSubmit = useCallback(
    async (payload: { pending: PendingMedicalFile[] }) => {
      if (!petId || !userId || !recordId) return;
      const allowed = await runWithProOrUpgrade(
        () => {},
        () => {
          upgradeAfterDismissRef.current = true;
          setAddOpen(false);
        },
      );
      if (!allowed) return;
      await uploadFileMut.mutateAsync({
        userId,
        files: payload.pending.map((p) => ({
          fileId: p.key,
          localUri: p.asset.uri,
          originalFilename: p.asset.name,
          mimeType: p.asset.mimeType,
          fileSizeBytes: p.asset.size,
        })),
      });
      setAddOpen(false);
    },
    [petId, recordId, uploadFileMut, userId, runWithProOrUpgrade],
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

  if (isError || !record || record.pet_id !== petId) {
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
      <ScreenHeader
        title="Medical record"
        onBack={() => router.back()}
        right={
          details ? (
            <PetNavAvatar
              displayPet={details}
              accessibilityLabelPrefix="Medical record for"
              // onAfterSwitchPet={onPetSwitch}
            />
          ) : (
            <View style={{ width: 40 }} />
          )
        }
      />

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
              editable={canEdit && isPro}
              placeholder="Title"
              placeholderTextColor={Colors.gray500}
            />

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Files</Text>
              {canEdit ? (
                <Pressable
                  onPress={() =>
                    void runWithProOrUpgrade(
                      () => setAddOpen(true),
                      () => setSoftPaywall("records"),
                    )
                  }
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
        visible={preview !== null}
        loading={preview?.loading ?? false}
        localUri={preview?.localUri ?? null}
        mimeType={preview?.file.mime_type}
        filename={preview?.file.original_filename ?? "Document"}
        onClose={closeFilePreview}
      />

      <MedicalRecordAddFilesModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onFullyDismissed={onAddFullyDismissed}
        mode="addFiles"
        isSubmitting={uploadFileMut.isPending}
        onSubmit={onAddFilesSubmit}
      />
      <ProSoftPaywallSheet
        visible={softPaywall != null}
        kind={softPaywall}
        petName={details?.name}
        onClose={() => setSoftPaywall(null)}
      />
    </View>
  );
}
