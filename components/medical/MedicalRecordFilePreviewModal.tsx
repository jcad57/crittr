import OrangeButton from "@/components/ui/buttons/OrangeButton";
import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import {
  getAuthFlowColumnOuterWidth,
  getResponsiveWindow,
} from "@/lib/responsiveUi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

function parentDirectoryFileUri(fileUri: string): string {
  const trimmed = fileUri.replace(/\/$/, "");
  const slash = trimmed.lastIndexOf("/");
  if (slash <= "file:".length) return trimmed;
  return `${trimmed.slice(0, slash)}/`;
}

function isRenderableImage(
  mimeType: string | null | undefined,
  fileUri: string,
): boolean {
  if (mimeType?.trim().startsWith("image/")) return true;
  const path = fileUri.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp)$/i.test(path);
}

/** Types WKWebView / Android WebView can usually render from a local file URI */
function canPreviewInWebView(
  mimeType: string | null | undefined,
  fileUri: string,
): boolean {
  const m = mimeType?.trim().toLowerCase() ?? "";
  if (m.includes("pdf")) return true;
  if (m.startsWith("text/html")) return true;
  if (m.startsWith("text/plain")) return true;
  const path = fileUri.split("?")[0].toLowerCase();
  return /\.(pdf|html|htm|txt)$/i.test(path);
}

/** Centers content vertically when space allows; scrolls on short viewports */
function PreviewFallbackPanel({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const rw = getResponsiveWindow(width, height);
  const columnMax = getAuthFlowColumnOuterWidth(width);
  const gutter =
    rw.shortestSide < 360 ? 14 : rw.shortestSide < 400 ? 18 : 24;

  return (
    <ScrollView
      style={styles.fallbackScroll}
      contentContainerStyle={[
        styles.fallbackScrollContent,
        {
          paddingHorizontal: gutter,
          paddingVertical: rw.shortestSide < 520 ? 20 : 32,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.fallbackColumn, { maxWidth: columnMax }]}>
        {children}
      </View>
    </ScrollView>
  );
}

type Props = {
  visible: boolean;
  loading: boolean;
  /** Local `file://` URI after download; ignored while loading */
  localUri: string | null;
  /** From storage metadata — used to choose image vs inline document preview */
  mimeType?: string | null;
  onClose: () => void;
};

export default function MedicalRecordFilePreviewModal({
  visible,
  loading,
  localUri,
  mimeType,
  onClose,
}: Props) {
  const [docPreviewFailed, setDocPreviewFailed] = useState(false);
  const { width, height } = useWindowDimensions();
  const rw = getResponsiveWindow(width, height);

  const showImagePreview =
    Boolean(localUri) && isRenderableImage(mimeType, localUri ?? "");

  const showWebPreview =
    Boolean(localUri) &&
    !showImagePreview &&
    canPreviewInWebView(mimeType, localUri ?? "");

  const readAccessUrl = useMemo(() => {
    if (!localUri || Platform.OS !== "ios") return undefined;
    return parentDirectoryFileUri(localUri);
  }, [localUri]);

  const docIconSize = rw.isTablet ? 72 : rw.shortestSide < 340 ? 48 : 56;
  const hintFontSize =
    rw.breakpoint === "expanded" ? 17 : rw.shortestSide < 340 ? 14 : 15;

  useEffect(() => {
    setDocPreviewFailed(false);
  }, [localUri]);

  useEffect(() => {
    if (!visible) setDocPreviewFailed(false);
  }, [visible]);

  const openWithShareSheet = useCallback(async () => {
    if (!localUri) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          "Sharing unavailable",
          "Sharing isn’t available on this device.",
        );
        return;
      }
      await Sharing.shareAsync(localUri, {
        mimeType: mimeType?.trim() || undefined,
        dialogTitle: "Open document",
      });
    } catch (e) {
      Alert.alert(
        "Could not open document",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    }
  }, [localUri, mimeType]);

  const shareHint =
    docPreviewFailed
      ? "This file couldn’t be shown in the app. Open it with another app instead."
      : Platform.OS === "ios"
        ? "This file type can be opened from the share sheet (Preview, Files, etc.)."
        : "This file type can be opened from the share menu.";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
        <View style={styles.toolbar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.doneBtn, pressed && styles.donePressed]}
            accessibilityRole="button"
            accessibilityLabel="Close preview"
          >
            <MaterialCommunityIcons
              name="close"
              size={26}
              color={Colors.textPrimary}
            />
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {loading ? (
            <PreviewFallbackPanel>
              <ActivityIndicator size="large" color={Colors.orange} />
              <Text
                style={[
                  styles.hint,
                  {
                    fontSize: hintFontSize,
                    lineHeight: Math.round(hintFontSize * 1.42),
                  },
                ]}
              >
                Loading document…
              </Text>
            </PreviewFallbackPanel>
          ) : localUri && showImagePreview ? (
            <Image
              source={{ uri: localUri }}
              style={styles.imagePreview}
              contentFit="contain"
              transition={150}
            />
          ) : localUri && showWebPreview && !docPreviewFailed ? (
            <WebView
              key={localUri}
              source={{ uri: localUri }}
              style={styles.webview}
              originWhitelist={["*"]}
              allowFileAccess
              allowFileAccessFromFileURLs
              allowingReadAccessToURL={readAccessUrl}
              scrollEnabled
              showsVerticalScrollIndicator
              nestedScrollEnabled
              onError={() => setDocPreviewFailed(true)}
              onHttpError={(e) => {
                if (e.nativeEvent.statusCode >= 400) {
                  setDocPreviewFailed(true);
                }
              }}
            />
          ) : localUri ? (
            <PreviewFallbackPanel>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={docIconSize}
                color={Colors.textSecondary}
              />
              <Text
                style={[
                  styles.hint,
                  {
                    fontSize: hintFontSize,
                    lineHeight: Math.round(hintFontSize * 1.42),
                  },
                ]}
              >
                {shareHint}
              </Text>
              <OrangeButton
                onPress={openWithShareSheet}
                style={styles.shareBtn}
              >
                Open or share document
              </OrangeButton>
            </PreviewFallbackPanel>
          ) : (
            <PreviewFallbackPanel>
              <Text
                style={[
                  styles.hint,
                  {
                    fontSize: hintFontSize,
                    lineHeight: Math.round(hintFontSize * 1.42),
                  },
                ]}
              >
                Could not load preview.
              </Text>
            </PreviewFallbackPanel>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.cream,
    flexShrink: 0,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  donePressed: {
    opacity: 0.7,
  },
  doneLabel: {
    fontFamily: Font.uiSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.white,
    minHeight: 0,
  },
  fallbackScroll: {
    flex: 1,
    width: "100%",
  },
  fallbackScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackColumn: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    gap: 16,
  },
  imagePreview: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.white,
  },
  webview: {
    flex: 1,
    width: "100%",
    backgroundColor: Colors.white,
  },
  hint: {
    fontFamily: Font.uiRegular,
    color: Colors.textSecondary,
    textAlign: "center",
    width: "100%",
    maxWidth: "100%",
  },
  shareBtn: {
    alignSelf: "stretch",
    width: "100%",
    marginTop: 8,
    maxWidth: "100%",
  },
});
