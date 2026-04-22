import HealthListCard from "@/components/ui/health/HealthListCard";
import { Colors } from "@/constants/colors";
import { recordSubtitle } from "@/utils/medicalRecordsListFormat";
import type { PetMedicalRecord } from "@/types/database";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "@/screen-styles/pet/[id]/medical-records.styles";

type Props = {
  loading: boolean;
  error: boolean;
  records: PetMedicalRecord[];
  fileCounts: Map<string, number>;
  showUploadTools: boolean;
  petId: string | undefined;
  push: (href: Href) => void;
};

export default function MedicalRecordsUploadsList({
  loading,
  error,
  records,
  fileCounts,
  showUploadTools,
  petId,
  push,
}: Props) {
  return (
    <HealthListCard>
      {loading ? (
        <View style={styles.paddedCenter}>
          <ActivityIndicator color={Colors.orange} />
        </View>
      ) : error ? (
        <Text style={styles.emptyText}>
          Could not load records. Pull to refresh or try again later.
        </Text>
      ) : records.length === 0 ? (
        <Text style={styles.emptyText}>
          {showUploadTools
            ? "No medical records yet. Tap Add medical record to upload PDFs or photos."
            : "No medical records yet."}
        </Text>
      ) : (
        records.map((r, i) => (
          <Pressable
            key={r.id}
            style={[styles.row, i < records.length - 1 && styles.rowBorder]}
            onPress={() =>
              push(
                `/(logged-in)/pet/${petId}/medical-records/${r.id}` as Href,
              )
            }
          >
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name="file-document-multiple-outline"
                size={22}
                color={Colors.lavenderDark}
              />
            </View>
            <View style={styles.mid}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={styles.rowMeta}>
                {recordSubtitle(r, fileCounts.get(r.id) ?? 0)}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.gray400}
            />
          </Pressable>
        ))
      )}
    </HealthListCard>
  );
}
