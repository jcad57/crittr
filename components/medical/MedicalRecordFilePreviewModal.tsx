import OrangeButton from "@/components/ui/buttons/OrangeButton";
import {
  openLocalMedicalRecord,
  saveLocalMedicalRecord,
  shareLocalMedicalRecord,
} from "@/services/medicalRecordFileActions";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { medicalRecordPreviewKind } from "@/utils/medicalRecordFiles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

type Props = {
  visible: boolean;
  loading: boolean;
  localUri: string | null;
  mimeType?: string | null;
  filename: string;
  onClose: () => void;
};

export default function MedicalRecordFilePreviewModal({
  visible,
  loading,
  localUri,
  mimeType,
  filename,
  onClose,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [action, setAction] = useState<"save" | "share" | "open" | null>(null);
  const actionGuard = useRef(false);
  const kind = medicalRecordPreviewKind(filename, mimeType, Platform.OS);

  useEffect(() => {
    setPreviewFailed(false);
  }, [localUri, visible]);

  const runAction = async (next: "save" | "share" | "open") => {
    if (!localUri || loading || actionGuard.current) return;
    actionGuard.current = true;
    setAction(next);
    try {
      if (next === "save") {
        const saved = await saveLocalMedicalRecord(
          localUri,
          filename,
          mimeType,
        );
        if (saved)
          Alert.alert(
            "Document saved",
            "A copy was saved in the folder you selected.",
          );
      } else if (next === "share") {
        await shareLocalMedicalRecord(localUri, mimeType);
      } else {
        await openLocalMedicalRecord(localUri, filename, mimeType);
      }
    } catch (error) {
      Alert.alert(
        `Could not ${next} document`,
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      actionGuard.current = false;
      setAction(null);
    }
  };

  const actionsDisabled = loading || !localUri || action !== null;
  const readAccess = localUri?.slice(0, localUri.lastIndexOf("/") + 1);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {/* A native Modal has its own window; measure its safe area independently. */}
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.safe}
          edges={["top", "bottom", "left", "right"]}
        >
          <View style={styles.toolbar}>
            <View style={styles.heading}>
              <Text style={styles.title}>Document</Text>
              <Text style={styles.filename} numberOfLines={2}>
                {filename}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close document viewer"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <MaterialCommunityIcons
                name="close"
                size={22}
                color={Colors.textPrimary}
              />
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.orange} />
                <Text style={styles.hint} accessibilityLiveRegion="polite">
                  Loading document…
                </Text>
              </View>
            ) : localUri && !previewFailed && kind === "image" ? (
              <Image
                source={{ uri: localUri }}
                style={styles.preview}
                contentFit="contain"
                accessibilityLabel={filename}
                onError={() => setPreviewFailed(true)}
              />
            ) : localUri && !previewFailed && kind === "web" ? (
              <WebView
                key={localUri}
                source={{ uri: localUri }}
                style={styles.preview}
                // Route every navigation through the strict callback below;
                // an excluded origin would otherwise be opened by the OS.
                originWhitelist={["*"]}
                allowFileAccess
                allowingReadAccessToURL={
                  Platform.OS === "ios" ? readAccess : undefined
                }
                javaScriptEnabled={false}
                domStorageEnabled={false}
                allowFileAccessFromFileURLs={false}
                allowUniversalAccessFromFileURLs={false}
                setSupportMultipleWindows={false}
                onShouldStartLoadWithRequest={({ url }) =>
                  url.split("#")[0] === localUri.split("#")[0]
                }
                onError={() => setPreviewFailed(true)}
                onContentProcessDidTerminate={() => setPreviewFailed(true)}
                onRenderProcessGone={() => setPreviewFailed(true)}
                onFileDownload={() => setPreviewFailed(true)}
              />
            ) : (
              <ScrollView contentContainerStyle={styles.fallback}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={64}
                  color={Colors.textSecondary}
                />
                <Text style={styles.hint}>
                  {localUri
                    ? previewFailed
                      ? "This preview couldn’t be displayed. Open the document in another app, save a copy, or share it below."
                      : "Open this document in another app, save a copy, or share it below."
                    : "This document couldn’t be loaded. Close the viewer and try again."}
                </Text>
                {localUri ? (
                  <OrangeButton
                    onPress={() => void runAction("open")}
                    disabled={actionsDisabled}
                    loading={action === "open"}
                  >
                    Open in another app
                  </OrangeButton>
                ) : null}
              </ScrollView>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.actions}>
              {(["save", "share"] as const).map((name) => (
                <Pressable
                  key={name}
                  onPress={() => void runAction(name)}
                  disabled={actionsDisabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${name === "save" ? "Save" : "Share"} document`}
                  accessibilityState={{
                    disabled: actionsDisabled,
                    busy: action === name,
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    actionsDisabled && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {action === name ? (
                    <ActivityIndicator size="small" color={Colors.orange} />
                  ) : (
                    <MaterialCommunityIcons
                      name={
                        name === "save" ? "download-outline" : "export-variant"
                      }
                      size={22}
                      color={Colors.orange}
                    />
                  )}
                  <Text style={styles.actionLabel}>
                    {name === "save" ? "Save" : "Share"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {Platform.OS === "ios" && localUri && !loading ? (
              <Text style={styles.saveHint}>
                To save a copy, choose Save to Files in the system sheet.
              </Text>
            ) : null}
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.screenBackground },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.cream,
    flexShrink: 0,
    zIndex: 1,
  },
  heading: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: Font.uiSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
  filename: {
    fontFamily: Font.uiRegular,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  closeButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.white,
  },
  closeLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  pressed: { opacity: 0.7 },
  body: { flex: 1, minHeight: 0, backgroundColor: Colors.white },
  preview: { flex: 1, width: "100%", backgroundColor: Colors.white },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  fallback: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  hint: {
    fontFamily: Font.uiRegular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 480,
  },
  footer: {
    flexShrink: 0,
    padding: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray200,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.white,
    padding: 12,
  },
  actionLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  disabled: { opacity: 0.45 },
  saveHint: {
    fontFamily: Font.uiRegular,
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
}));
