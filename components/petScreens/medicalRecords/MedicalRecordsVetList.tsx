import HealthListCard from "@/components/ui/health/HealthListCard";
import { Colors } from "@/constants/colors";
import { vetKindIcon } from "@/utils/medicalRecordsListFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles } from "@/screen-styles/pet/[id]/medical-records.styles";

export type VetRow = {
  key: string;
  kind: "visit" | "vaccination";
  title: string;
  dateLabel: string;
  summary: string;
  href: Href;
};

type Props = {
  loading: boolean;
  vetRows: VetRow[];
  push: (href: Href) => void;
};

export default function MedicalRecordsVetList({ loading, vetRows, push }: Props) {
  return (
    <HealthListCard>
      {loading ? (
        <View style={styles.paddedCenter}>
          <ActivityIndicator color={Colors.orange} />
        </View>
      ) : vetRows.length === 0 ? (
        <Text style={styles.emptyText}>
          Coming soon: your clinic will upload PDFs and documents here—the same
          kinds of files as under Your uploads, delivered to this pet&apos;s
          portal. For now, add records with Add medical record above.
        </Text>
      ) : (
        vetRows.map((r, i) => (
          <Pressable
            key={r.key}
            style={[styles.row, i < vetRows.length - 1 && styles.rowBorder]}
            onPress={() => push(r.href)}
          >
            <View style={styles.iconBox}>
              <MaterialCommunityIcons
                name={vetKindIcon(r.kind)}
                size={20}
                color={Colors.lavenderDark}
              />
            </View>
            <View style={styles.mid}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={styles.rowMeta}>{r.dateLabel}</Text>
              <Text style={styles.rowSummary} numberOfLines={3}>
                {r.summary}
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
