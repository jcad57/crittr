import { Text, View } from "react-native";
import { styles } from "@/screen-styles/pet/[id]/index.styles";

type InfoRowProps = { label: string; value: string; isLast?: boolean };

export default function InfoRow({ label, value, isLast }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}
