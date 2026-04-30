import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  captureMedicalPhoto,
  pickMedicalDocuments,
  pickMedicalPhotosFromLibrary,
  type PickedMedicalAsset,
} from "@/lib/medicalRecordMedia";
import { randomUploadId } from "@/services/petMedicalRecords";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const WINDOW_HEIGHT = Dimensions.get("window").height;

const SHEET_SLIDE_DISTANCE = Math.min(480, WINDOW_HEIGHT * 0.55);

/** ~3 file rows visible before scrolling (row ≈ icon + 2 lines + padding). */
const PENDING_ROW_APPROX_HEIGHT = 52;
const PENDING_VISIBLE_ROWS = 3;
const PENDING_LIST_MAX_HEIGHT =
  PENDING_ROW_APPROX_HEIGHT * PENDING_VISIBLE_ROWS;

export type PendingMedicalFile = {
  key: string;
  asset: PickedMedicalAsset;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  mode: "create" | "addFiles";
  /** Called with record name (create) or undefined (addFiles) and file list. */
  onSubmit: (payload: {
    recordName?: string;
    pending: PendingMedicalFile[];
  }) => Promise<void>;
  isSubmitting: boolean;
  /**
   * Fires once the sheet has finished its close animation and unmounted.
   * Use this to show another full-screen Modal on iOS (stacking two Modals
   * while the first is dismissing often fails silently).
   */
  onFullyDismissed?: () => void;
};

export default function MedicalRecordAddFilesModal({
  visible,
  onClose,
  mode,
  onSubmit,
  isSubmitting,
  onFullyDismissed,
}: Props) {
  const insets = useSafeAreaInsets();
  const [recordName, setRecordName] = useState("");
  const [pending, setPending] = useState<PendingMedicalFile[]>([]);
  /** Set synchronously when Create/Add is pressed so the spinner paints before
   *  async work; parent `isSubmitting` can lag a frame. Avoids disabled Pressable
   *  + ActivityIndicator quirks on Android. */
  const [submitBusy, setSubmitBusy] = useState(false);
  const submitGuardRef = useRef(false);
  /** True while a picker is finishing (e.g. SAF copy to cache) — UI freezes without feedback. */
  const [importBusy, setImportBusy] = useState(false);
  const importGuardRef = useRef(false);

  /** Keeps Modal mounted until exit animation finishes. */
  const [modalMounted, setModalMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(
    new Animated.Value(SHEET_SLIDE_DISTANCE),
  ).current;
  const openAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const closeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  /** True once user has opened the modal at least once this session (skip close anim on cold start). */
  const wasShownRef = useRef(false);

  /** Only reset modal state AFTER the sheet has fully closed. Clearing while
   *  `visible` flips to false can drop a pending selection during the
   *  dismiss animation on Android (where the backing activity pause/resume
   *  briefly re-runs effects). We gate the reset on `modalMounted === false`
   *  which is only set after the close animation actually finishes. */
  useEffect(() => {
    if (!visible && !modalMounted) {
      setRecordName("");
      setPending([]);
      setSubmitBusy(false);
      submitGuardRef.current = false;
      setImportBusy(false);
      importGuardRef.current = false;
    }
  }, [visible, modalMounted]);

  useEffect(() => {
    if (visible) {
      wasShownRef.current = true;
      openAnimRef.current?.stop();
      closeAnimRef.current?.stop();
      setModalMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_SLIDE_DISTANCE);
      const open = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);
      openAnimRef.current = open;
      requestAnimationFrame(() => {
        open.start(() => {
          openAnimRef.current = null;
        });
      });
      return;
    }

    if (!wasShownRef.current) return;
    wasShownRef.current = false;

    openAnimRef.current?.stop();
    closeAnimRef.current?.stop();
    const close = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_SLIDE_DISTANCE,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    closeAnimRef.current = close;
    close.start(({ finished }) => {
      closeAnimRef.current = null;
      if (finished) {
        setModalMounted(false);
        onFullyDismissed?.();
      }
    });
  }, [visible, backdropOpacity, sheetTranslateY, onFullyDismissed]);

  const appendAssets = useCallback((assets: PickedMedicalAsset[]) => {
    setPending((prev) => [
      ...prev,
      ...assets.map((asset) => ({
        key: randomUploadId(),
        asset,
      })),
    ]);
  }, []);

  const runSubmit = useCallback(async () => {
    if (pending.length === 0 || submitGuardRef.current) return;
    submitGuardRef.current = true;
    setSubmitBusy(true);
    try {
      if (mode === "create") {
        await onSubmit({
          recordName: recordName.trim() || undefined,
          pending,
        });
      } else {
        await onSubmit({ pending });
      }
    } finally {
      submitGuardRef.current = false;
      setSubmitBusy(false);
    }
  }, [mode, onSubmit, pending, recordName]);

  const submitting = submitBusy || isSubmitting;
  const sheetBlocked = importBusy || submitting;

  const addFromFiles = useCallback(async () => {
    if (importGuardRef.current || submitting) return;
    importGuardRef.current = true;
    setImportBusy(true);
    try {
      const assets = await pickMedicalDocuments();
      if (assets.length) appendAssets(assets);
    } finally {
      importGuardRef.current = false;
      setImportBusy(false);
    }
  }, [appendAssets, submitting]);

  const addFromCamera = useCallback(async () => {
    if (importGuardRef.current || submitting) return;
    importGuardRef.current = true;
    setImportBusy(true);
    try {
      const shot = await captureMedicalPhoto();
      if (shot) appendAssets([shot]);
    } finally {
      importGuardRef.current = false;
      setImportBusy(false);
    }
  }, [appendAssets, submitting]);

  const addFromLibrary = useCallback(async () => {
    if (importGuardRef.current || submitting) return;
    importGuardRef.current = true;
    setImportBusy(true);
    try {
      const shots = await pickMedicalPhotosFromLibrary();
      if (shots.length > 0) appendAssets(shots);
    } finally {
      importGuardRef.current = false;
      setImportBusy(false);
    }
  }, [appendAssets, submitting]);

  /** Do NOT clear pending/recordName here — leave that to the "fully dismissed"
   *  effect. If the user accidentally double-taps the backdrop or triggers
   *  onRequestClose from a stray Android lifecycle event, we don't want to
   *  silently throw away a just-picked selection before `onClose` propagates. */
  const handleClose = useCallback(() => {
    if (sheetBlocked) return;
    onClose();
  }, [sheetBlocked, onClose]);

  const sheetBottomPad = insets.bottom + 28;

  return (
    <Modal
      visible={modalMounted}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.dimLayer, { opacity: backdropOpacity }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            disabled={sheetBlocked}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          enabled={Platform.OS === "ios"}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.modalSheet,
              {
                paddingBottom: sheetBottomPad,
                maxHeight: WINDOW_HEIGHT * 0.88,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <Text style={styles.modalTitle}>
              {mode === "create" ? "New medical record" : "Add files"}
            </Text>
            <Text style={styles.modalSub}>
              {mode === "create"
                ? "Name this record, then add one or more files (photos, PDFs)."
                : "Add photos or documents to this record."}
            </Text>

            {mode === "create" ? (
              <TextInput
                style={styles.recordNameInput}
                value={recordName}
                onChangeText={setRecordName}
                placeholder="Record name"
                placeholderTextColor={Colors.gray500}
                editable={!sheetBlocked}
              />
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={[
                  styles.modalBtn,
                  sheetBlocked && styles.modalBtnDisabled,
                ]}
                onPress={() => void addFromFiles()}
                disabled={sheetBlocked}
              >
                <MaterialCommunityIcons
                  name="file-upload-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.modalBtnText}>Files</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  sheetBlocked && styles.modalBtnDisabled,
                ]}
                onPress={() => void addFromCamera()}
                disabled={sheetBlocked}
              >
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.modalBtnText}>Camera</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  sheetBlocked && styles.modalBtnDisabled,
                ]}
                onPress={() => void addFromLibrary()}
                disabled={sheetBlocked}
              >
                <MaterialCommunityIcons
                  name="image-multiple-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.modalBtnText}>Photos</Text>
              </Pressable>
            </View>

            {pending.length > 0 ? (
              <View style={styles.pendingWrap}>
                <Text style={styles.pendingHeader}>
                  {pending.length === 1
                    ? "1 file selected"
                    : `${pending.length} files selected`}
                </Text>
                <ScrollView
                  style={[styles.pendingScroll, { maxHeight: PENDING_LIST_MAX_HEIGHT }]}
                  contentContainerStyle={styles.pendingScrollContent}
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {pending.map((row) => (
                    <View key={row.key} style={styles.pendingRow}>
                      <MaterialCommunityIcons
                        name={
                          (row.asset.mimeType ?? "").startsWith("image/")
                            ? "image-outline"
                            : "file-document-outline"
                        }
                        size={18}
                        color={Colors.gray500}
                      />
                      <Text style={styles.pendingName} numberOfLines={2}>
                        {row.asset.name}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setPending((p) =>
                            p.filter((x) => x.key !== row.key),
                          )
                        }
                        hitSlop={8}
                        disabled={sheetBlocked}
                      >
                        <MaterialCommunityIcons
                          name="close-circle"
                          size={22}
                          color={Colors.gray400}
                        />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={sheetBlocked}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              {submitting ? (
                <View
                  style={styles.submitBtn}
                  accessibilityRole="progressbar"
                  accessibilityState={{ busy: true }}
                >
                  <ActivityIndicator
                    color={Colors.white}
                    size={Platform.OS === "android" ? "large" : "small"}
                  />
                </View>
              ) : (
                <Pressable
                  style={[
                    styles.submitBtn,
                    (pending.length === 0 || importBusy) &&
                      styles.submitBtnDisabled,
                  ]}
                  disabled={pending.length === 0 || importBusy}
                  accessibilityState={{
                    disabled: pending.length === 0 || importBusy,
                  }}
                  onPress={() => void runSubmit()}
                >
                  <Text style={styles.submitBtnText}>
                    {mode === "create" ? "Create" : "Add"}
                    {pending.length > 0 ? ` (${pending.length})` : ""}
                  </Text>
                </Pressable>
              )}
            </View>

            {importBusy ? (
              <View
                style={styles.importOverlay}
                pointerEvents="auto"
                accessibilityRole="progressbar"
                accessibilityLabel="Preparing selected files"
              >
                <ActivityIndicator size="large" color={Colors.orange} />
                <Text style={styles.importOverlayText}>
                  Getting your files ready…
                </Text>
                <Text style={styles.importOverlayHint}>
                  Large documents may take a few seconds.
                </Text>
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dimLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  keyboardWrap: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
  },
  modalSheet: {
    position: "relative",
    alignSelf: "stretch",
    width: "100%",
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    overflow: "hidden",
  },
  modalTitle: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  modalSub: {
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  recordNameInput: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  modalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray100,
    backgroundColor: Colors.cream,
  },
  modalBtnDisabled: {
    opacity: 0.45,
  },
  modalBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pendingWrap: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: 12,
    padding: 10,
    backgroundColor: Colors.cream,
  },
  pendingHeader: {
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  pendingScroll: {
    flexGrow: 0,
  },
  pendingScrollContent: {
    paddingVertical: 2,
    flexGrow: 0,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  pendingName: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.gray500,
  },
  submitBtn: {
    backgroundColor: Colors.orange,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 120,
    minHeight: Platform.OS === "android" ? 52 : 48,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.white,
  },
  importOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.94)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    paddingHorizontal: 28,
  },
  importOverlayText: {
    marginTop: 16,
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  importOverlayHint: {
    marginTop: 8,
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
