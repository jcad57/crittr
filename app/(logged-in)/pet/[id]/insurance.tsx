import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import PetInsuranceToggle from "@/components/onboarding/petInfo/PetInsuranceToggle";
import OrangeButton from "@/components/ui/buttons/OrangeButton";
import PetNavAvatar from "@/components/ui/PetNavAvatar";
import { Colors } from "@/constants/colors";
import { Font, MANAGE_SCREEN_TITLE_SIZE } from "@/constants/typography";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeKind(mime: string | null): "pdf" | "image" {
  if (!mime) return "image";
  if (mime === "application/pdf" || mime.includes("pdf")) return "pdf";
  return "image";
}

function insuranceStatusLabel(isInsured: boolean | null): {
  line1: string;
  line2?: string;
} {
  if (isInsured === true) return { line1: "Yes" };
  return { line1: "No" };
}

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
    const st = insuranceStatusLabel(details.is_insured ?? null);
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
        <View style={styles.nav}>
          <View style={styles.navSideLeft}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.navBack}>&lt; Back</Text>
            </Pressable>
          </View>
          <Text style={styles.navTitle} numberOfLines={1}>
            Insurance
          </Text>
          <View style={styles.navSideRight}>
            <PetNavAvatar
              displayPet={details}
              accessibilityLabelPrefix="Insurance for"
            />
          </View>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollInsetBottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CoCareReadOnlyNotice />
          <ReadOnlyFieldRow label="Pet insurance" value={st.line1} />
          {details.is_insured === true ? (
            <>
              <ReadOnlyFieldRow
                label="Insurance company"
                value={details.insurance_provider?.trim() || "—"}
              />
              <ReadOnlyFieldRow
                label="Policy number"
                value={details.insurance_policy_number?.trim() || "—"}
              />
            </>
          ) : null}
          <Text style={styles.sectionLabel}>Policy documents</Text>
          {filesLoading ? (
            <View style={styles.paddedCenter}>
              <ActivityIndicator color={Colors.orange} />
            </View>
          ) : files.length === 0 ? (
            <Text style={styles.emptyFiles}>No documents on file.</Text>
          ) : (
            <View style={styles.fileList}>
              {files.map((f, i) => (
                <Pressable
                  key={f.id}
                  style={[
                    styles.fileRowReadOnly,
                    i < files.length - 1 && styles.fileRowBorder,
                  ]}
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
              ))}
            </View>
          )}
        </ScrollView>
      </View>
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
      <View style={styles.nav}>
        <View style={styles.navSideLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.navBack}>&lt; Back</Text>
          </Pressable>
        </View>
        <Text style={styles.navTitle} numberOfLines={1}>
          Insurance
        </Text>
        <View style={styles.navSideRight}>
          <PetNavAvatar
            displayPet={details}
            accessibilityLabelPrefix="Insurance for"
          />
        </View>
      </View>

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
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navSideLeft: {
    width: 72,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  navSideRight: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  navBack: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  navTitle: {
    flex: 1,
    fontFamily: Font.displayBold,
    fontSize: MANAGE_SCREEN_TITLE_SIZE,
    color: Colors.textPrimary,
    textAlign: "center",
    marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
  },
  scrollContentGrow: { flexGrow: 1 },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
  },
  formMain: {
    flexShrink: 0,
    gap: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  lead: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  label: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  input: {
    fontFamily: Font.uiRegular,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  sectionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
    marginTop: 8,
  },
  policyDocsHeader: {
    marginTop: 4,
    gap: 10,
  },
  sectionTitle: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.sectionLabel,
    textTransform: "uppercase",
  },
  /** Matches vaccinations list “Add vaccination” control. */
  addFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
  },
  addFileBtnPressed: {
    opacity: 0.85,
  },
  addFileBtnDisabled: {
    opacity: 0.55,
  },
  addFileBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.orange,
  },
  policyDocsHelper: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  hintWhenOff: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  paddedCenter: {
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
  },
  loadingDocsHint: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  policyDocsLoadingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  policyDocsLoadingText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fileListMuted: {
    opacity: 0.55,
  },
  emptyFiles: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  fileList: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    overflow: "hidden",
  },
  fileRowWrap: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  fileRowReadOnly: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  fileRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 10,
  },
  fileRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray100,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.skyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  fileIconPdf: {
    backgroundColor: Colors.orangeLight,
  },
  fileMid: { flex: 1, minWidth: 0 },
  fileName: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  fileMeta: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.gray500,
    marginTop: 2,
  },
  trashBtn: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionsBlock: {
    paddingTop: 24,
    width: "100%",
  },
  saveBtn: {
    marginTop: 0,
  },
});
