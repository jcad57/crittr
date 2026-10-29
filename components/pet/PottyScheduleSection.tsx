import { useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import InlineTimePickerSheet from "@/components/ui/InlineTimePickerSheet";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { dateToPgTime, formatFeedTimeLabel, pgTimeToDate } from "@/utils/petFoodTime";
import { normalizePottyTimes } from "@/utils/pottySchedule";
import type { DateTimePickerEvent } from "@/components/ui/pickers/CrittrDateTimePicker";

type Props = { times: string[]; onChange?: (times: string[]) => void; readOnly?: boolean; disabled?: boolean };

/** Same add/edit/remove pattern as meal portions, with just one daily time per row. */
export default function PottyScheduleSection({ times, onChange, readOnly = false, disabled = false }: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { timeDisplay } = useUserDateTimePrefs();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState(() => pgTimeToDate("08:00:00"));
  const close = () => setEditing(null);
  const open = (index: number | "new") => {
    const initial = index === "new" ? pgTimeToDate(times.at(-1) ?? "04:00:00") : pgTimeToDate(times[index]);
    if (index === "new") initial.setHours((initial.getHours() + 4) % 24);
    initial.setSeconds(0, 0);
    setDraft(initial);
    setEditing(index);
  };
  const save = (date: Date) => {
    if (editing === null || disabled || readOnly || !onChange) return;
    const value = new Date(date);
    value.setSeconds(0, 0);
    const time = dateToPgTime(value);
    if (times.some((existing, index) => index !== editing && existing.slice(0, 5) === time.slice(0, 5))) {
      if (Platform.OS === "android") close();
      Alert.alert("Potty time already added", "Choose a different time for this break.");
      return;
    }
    onChange(normalizePottyTimes(editing === "new" ? [...times, time] : times.map((current, index) => index === editing ? time : current)));
    close();
  };
  const changeTime = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") { if (Platform.OS === "android") close(); return; }
    if (!date) return;
    if (Platform.OS === "android") save(date);
    else setDraft(date);
  };
  return <View style={styles.section}>
    <Text style={styles.title}>Potty schedule</Text>
    <Text style={styles.helper}>Pick the ideal times for a potty break. Reminders repeat every day.</Text>
    {times.length === 0 && readOnly ? <Text style={styles.helper}>No potty times added.</Text> : null}
    {times.map((time, index) => <View key={time} style={styles.row}>
      <View style={styles.rowMain}><Text style={styles.time}>{formatFeedTimeLabel(time, timeDisplay)}</Text><Text style={styles.daily}>Every day</Text></View>
      {!readOnly ? <View style={styles.actions}>
        <Pressable onPress={() => open(index)} disabled={disabled} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`Edit potty time ${formatFeedTimeLabel(time, timeDisplay)}`}><MaterialCommunityIcons name="pencil-outline" size={22} color={Colors.orange} /></Pressable>
        <Pressable onPress={() => onChange?.(times.filter((_, i) => i !== index))} disabled={disabled} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={`Remove potty time ${formatFeedTimeLabel(time, timeDisplay)}`}><MaterialCommunityIcons name="trash-can-outline" size={22} color={Colors.error} /></Pressable>
      </View> : null}
    </View>)}
    {!readOnly ? <Pressable onPress={() => open("new")} disabled={disabled} style={[styles.addButton, disabled && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel="Add potty time"><MaterialCommunityIcons name="plus-circle-outline" size={22} color={Colors.orange} /><Text style={styles.addText}>Add potty time</Text></Pressable> : null}
    {editing !== null ? <Modal visible transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={close}>
      <InlineTimePickerSheet visible value={draft} is24Hour={timeDisplay === "24h"} title={editing === "new" ? "Add potty time" : "Edit potty time"} onNativeChange={changeTime} onCancel={close} onConfirm={() => save(draft)} />
    </Modal> : null}
  </View>;
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  section: { marginTop: 20, marginBottom: 12 },
  title: { fontFamily: Font.uiSemiBold, fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },
  helper: { fontFamily: Font.uiRegular, fontSize: 13, lineHeight: 19, color: Colors.textSecondary, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200, borderRadius: 12, padding: 14, marginBottom: 10 },
  rowMain: { flex: 1 },
  time: { fontFamily: Font.uiSemiBold, fontSize: 16, color: Colors.textPrimary },
  daily: { fontFamily: Font.uiRegular, fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  actions: { flexDirection: "row", gap: 4 },
  iconButton: { padding: 8, borderRadius: 8 },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.orange, backgroundColor: Colors.orangeLight, borderRadius: 12, paddingVertical: 14 },
  addText: { fontFamily: Font.uiSemiBold, fontSize: 15, color: Colors.orange },
}));
