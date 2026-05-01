import CoCareReadOnlyNotice from "@/components/coCare/CoCareReadOnlyNotice";
import { ReadOnlyFieldRow } from "@/components/coCare/ReadOnlyFieldRow";
import { Colors } from "@/constants/colors";
import type { PetInsuranceFile, PetWithDetails } from "@/types/database";
import { formatBytes, mimeKind } from "@/utils/fileAttachmentDisplay";
import { insuranceStatusLabel } from "@/utils/insuranceScreenHelpers";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { styles } from "@/screen-styles/pet/[id]/insurance.styles";
import InsuranceNavHeader from "./InsuranceNavHeader";

type Props = {
  details: PetWithDetails;
  files: PetInsuranceFile[];
  filesLoading: boolean;
  scrollInsetBottom: number;
  onBack: () => void;
  openFile: (f: PetInsuranceFile) => void;
  onAfterSwitchPet?: (newPetId: string) => void;
};

export default function InsuranceReadOnlyView({
  details,
  files,
  filesLoading,
  scrollInsetBottom,
  onBack,
  openFile,
  onAfterSwitchPet,
}: Props) {
  const insets = useSafeAreaInsets();
  const st = insuranceStatusLabel(details.is_insured ?? null);
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <InsuranceNavHeader
        displayPet={details}
        onBack={onBack}
        onAfterSwitchPet={onAfterSwitchPet}
      />
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
