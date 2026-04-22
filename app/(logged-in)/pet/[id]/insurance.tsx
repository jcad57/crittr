import PetInsuranceToggle from "@/components/onboarding/petInfo/PetInsuranceToggle";
import InsuranceNavHeader from "@/components/petScreens/petInsurance/InsuranceNavHeader";
import InsurancePolicyDocsSection from "@/components/petScreens/petInsurance/InsurancePolicyDocsSection";
import InsuranceReadOnlyView from "@/components/petScreens/petInsurance/InsuranceReadOnlyView";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import {
  useDeletePetInsuranceFileMutation,
  usePetDetailsQuery,
  usePetInsuranceFilesQuery,
  useUpdatePetInsuranceMutation,
  useUploadPetInsuranceFileMutation,
} from "@/hooks/queries";
import { useCanPerformAction } from "@/hooks/useCanPerformAction";
import { useFloatingNavScrollInset } from "@/hooks/useFloatingNavScrollInset";
import {
  captureMedicalPhoto,
  pickMedicalDocuments,
  pickMedicalPhotoFromLibrary,
} from "@/lib/medicalRecordMedia";
import { createSignedPetInsuranceUrl } from "@/services/petInsurance";
import { useAuthStore } from "@/stores/authStore";
import type { PetInsuranceFile } from "@/types/database";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  TextInput,
  useWindowDimensions,
  View,
  Text,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/insurance.styles";

export default function PetInsuranceScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const petId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const scrollInsetBottom = useFloatingNavScrollInset();
  const userId = useAuthStore((s) => s.session?.user?.id);

  const { data: details, isLoading } = usePetDetailsQuery(petId);
  const { data: files = [], isLoading: filesLoading } =
    usePetInsuranceFilesQuery(petId);
  const canEditProfile = useCanPerformAction(petId, "can_edit_pet_profile");

  const updateMut = useUpdatePetInsuranceMutation(petId ?? "");
  const uploadMut = useUploadPetInsuranceFileMutation(petId ?? "");
  const deleteMut = useDeletePetInsuranceFileMutation(petId ?? "");

  const [isInsured, setIsInsured] = useState<boolean>(false);
  const [company, setCompany] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");

  useEffect(() => {
    if (!details) return;
    setIsInsured(details.is_insured ?? false);
    setCompany(details.insurance_provider?.trim() ?? "");
    setPolicyNumber(details.insurance_policy_number?.trim() ?? "");
  }, [details]);

  const scrollContentMinHeight = useMemo(() => {
    const topChrome = insets.top + 8 + 56 + 12;
    return Math.max(windowHeight - topChrome - insets.bottom, 240);
  }, [insets.top, insets.bottom, windowHeight]);

  const baseline = useMemo(() => {
    if (!details) return null;
    return {
      is_insured: details.is_insured ?? null,
      insurance_provider: details.insurance_provider?.trim() ?? "",
      insurance_policy_number: details.insurance_policy_number?.trim() ?? "",
    };
  }, [details]);

  const dirty = useMemo(() => {
    if (!baseline) return false;
    return (
      isInsured !== (baseline.is_insured ?? false) ||
      company.trim() !== baseline.insurance_provider ||
      policyNumber.trim() !== baseline.insurance_policy_number
    );
  }, [baseline, isInsured, company, policyNumber]);

  const canSave = Boolean(petId) && Boolean(userId) && dirty;

  const openFile = useCallback(async (f: PetInsuranceFile) => {
    try {
      const url = await createSignedPetInsuranceUrl(f.storage_path);
      await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert("Could not open file", "Please try again.");
    }
  }, []);

  const confirmDeleteFile = useCallback(
    (f: PetInsuranceFile) => {
      Alert.alert(
        "Remove file?",
        f.original_filename ?? "This document will be deleted.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () =>
              deleteMut.mutate(f, {
                onError: () =>
                  Alert.alert("Could not remove", "Please try again."),
              }),
          },
        ],
      );
    },
    [deleteMut],
  );

  const onPickDocuments = useCallback(async () => {
    if (!petId || !userId || isInsured !== true) return;
    const picked = await pickMedicalDocuments();
    for (const a of picked) {
      await uploadMut.mutateAsync({
        localUri: a.uri,
        originalFilename: a.name,
        mimeType: a.mimeType,
        fileSizeBytes: a.size,
      });
    }
  }, [petId, userId, isInsured, uploadMut]);

  const onPickPhoto = useCallback(async () => {
    if (!petId || !userId || isInsured !== true) return;
    const a = await pickMedicalPhotoFromLibrary();
    if (!a) return;
    await uploadMut.mutateAsync({
      localUri: a.uri,
      originalFilename: a.name,
      mimeType: a.mimeType,
      fileSizeBytes: a.size,
    });
  }, [petId, userId, isInsured, uploadMut]);

  const onTakePhoto = useCallback(async () => {
    if (!petId || !userId || isInsured !== true) return;
    const a = await captureMedicalPhoto();
    if (!a) return;
    await uploadMut.mutateAsync({
      localUri: a.uri,
      originalFilename: a.name,
      mimeType: a.mimeType,
      fileSizeBytes: a.size,
    });
  }, [petId, userId, isInsured, uploadMut]);

  const onAddFile = useCallback(() => {
    Alert.alert("Add policy document", undefined, [
      { text: "Cancel", style: "cancel" },
      { text: "Choose file", onPress: () => void onPickDocuments() },
      { text: "Photo library", onPress: () => void onPickPhoto() },
      { text: "Take photo", onPress: () => void onTakePhoto() },
    ]);
  }, [onPickDocuments, onPickPhoto, onTakePhoto]);

  const onSave = useCallback(async () => {
    if (!petId) return;
    const providerTrim = isInsured === true ? company.trim() || null : null;
    const policyTrim = isInsured === true ? policyNumber.trim() || null : null;
    try {
      await updateMut.mutateAsync({
        is_insured: isInsured,
        insurance_provider: providerTrim,
        insurance_policy_number: policyTrim,
      });
      router.back();
    } catch {
      Alert.alert("Could not save", "Please try again.");
    }
  }, [petId, isInsured, company, policyNumber, updateMut, router]);

  if (isLoading || !details) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.orange} />
      </View>
    );
  }

  if (canEditProfile === false) {
    return (
      <InsuranceReadOnlyView
        details={details}
        files={files}
        filesLoading={filesLoading}
        scrollInsetBottom={scrollInsetBottom}
        onBack={() => router.back()}
        openFile={openFile}
      />
    );
  }

  const busy =
    updateMut.isPending || uploadMut.isPending || deleteMut.isPending;
  const policyDocsUploading = uploadMut.isPending;
  const deletingFileId =
    deleteMut.isPending && deleteMut.variables?.id
      ? deleteMut.variables.id
      : null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <InsuranceNavHeader displayPet={details} onBack={() => router.back()} />

      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
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
            <Text style={styles.lead}>
              Keep your pet's insurance policy number, and a copy of your policy
              PDF or photos in one place.
            </Text>

            <PetInsuranceToggle value={isInsured} onChange={setIsInsured} />

            {isInsured === true ? (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Insurance company</Text>
                  <TextInput
                    style={styles.input}
                    value={company}
                    onChangeText={setCompany}
                    placeholder="e.g. Trupanion, Nationwide"
                    placeholderTextColor={Colors.gray400}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Policy number</Text>
                  <TextInput
                    style={styles.input}
                    value={policyNumber}
                    onChangeText={setPolicyNumber}
                    placeholder="Policy or member ID"
                    placeholderTextColor={Colors.gray400}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <InsurancePolicyDocsSection
                  files={files}
                  filesLoading={filesLoading}
                  policyDocsUploading={policyDocsUploading}
                  deletingFileId={deletingFileId}
                  busy={busy}
                  onAddFile={onAddFile}
                  openFile={openFile}
                  confirmDeleteFile={confirmDeleteFile}
                />
              </>
            ) : null}
          </View>

          <View style={styles.actionsBlock}>
            <OrangeButton
              onPress={onSave}
              loading={updateMut.isPending}
              disabled={!canSave || uploadMut.isPending || deleteMut.isPending}
              style={styles.saveBtn}
            >
              Save
            </OrangeButton>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
