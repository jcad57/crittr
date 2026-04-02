import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  captureMedicalPhoto,
  pickMedicalDocuments,
  pickMedicalPhotoFromLibrary,
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

const SHEET_SLIDE_DISTANCE = Math.min(480, Dimensions.get("window").height * 0.55);

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
};

export default function MedicalRecordAddFilesModal({
  visible,
  onClose,
  mode,
  onSubmit,
  isSubmitting,
}: Props) {
  const insets = useSafeAreaInsets();
  const [recordName, setRecordName] = useState("");
  const [pending, setPending] = useState<PendingMedicalFile[]>([]);

  /** Keeps Modal mounted until exit animation finishes. */
  const [modalMounted, setModalMounted] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_SLIDE_DISTANCE)).current;
  const openAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const closeAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  /** True once user has opened the modal at least once this session (skip close anim on cold start). */
  const wasShownRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      setRecordName("");
      setPending([]);
    }
  }, [visible]);

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
      if (finished) setModalMounted(false);
    });
  }, [visible, backdropOpacity, sheetTranslateY]);

  const appendAssets = useCallback((assets: PickedMedicalAsset[]) => {
    setPending((prev) => [
      ...prev,
      ...assets.map((asset) => ({
        key: randomUploadId(),
        asset,
      })),
    ]);
  }, []);

  const addFromFiles = useCallback(async () => {
    const assets = await pickMedicalDocuments();
    if (assets.length) appendAssets(assets);
  }, [appendAssets]);

  const addFromCamera = useCallback(async () => {
    const shot = await captureMedicalPhoto();
    if (shot) appendAssets([shot]);
  }, [appendAssets]);

  const addFromLibrary = useCallback(async () => {
    const shot = await pickMedicalPhotoFromLibrary();
    if (shot) appendAssets([shot]);
  }, [appendAssets]);

  const submit = useCallback(async () => {
    if (pending.length === 0) return;
    if (mode === "create") {
      await onSubmit({
        recordName: recordName.trim() || undefined,
        pending,
      });
    } else {
      await onSubmit({ pending });
    }
  }, [mode, onSubmit, pending, recordName]);

  const handleClose = useCallback(() => {
    setRecordName("");
    setPending([]);
    onClose();
  }, [onClose]);

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
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.modalSheet,
              {
                paddingBottom: insets.bottom + 16,
                maxHeight: "88%",
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
              />
            ) : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtn} onPress={addFromFiles}>
                <MaterialCommunityIcons
                  name="file-upload-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.modalBtnText}>Files</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={addFromCamera}>
                <MaterialCommunityIcons
                  name="camera-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.modalBtnText}>Camera</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={addFromLibrary}>
                <MaterialCommunityIcons
                  name="image-multiple-outline"
                  size={20}
                  color={Colors.orange}
                />
                <Text style={styles.modalBtnText}>Photos</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.pendingScroll}>
              {pending.map((row) => (
                <View key={row.key} style={styles.pendingRow}>
                  <Text style={styles.pendingName} numberOfLines={2}>
                    {row.asset.name}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setPending((p) => p.filter((x) => x.key !== row.key))
                    }
                    hitSlop={8}
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

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.submitBtn,
                  (pending.length === 0 || isSubmitting) &&
                    styles.submitBtnDisabled,
                ]}
                disabled={pending.length === 0 || isSubmitting}
                onPress={() => void submit()}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {mode === "create" ? "Create" : "Add"}
                    {pending.length > 0 ? ` (${pending.length})` : ""}
                  </Text>
                )}
              </Pressable>
            </View>
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
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  modalBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pendingScroll: { maxHeight: 280 },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingVertical: 4,
  },
  pendingName: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
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
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.white,
  },
});
