import { createThemeValues, useThemeColors, useThemeValues } from "@/theme/colors";
import { Font } from "@/theme/typography";
import { useUserDateTimePrefs } from "@/hooks/useUserDateTimePrefs";
import { dateLocaleFor } from "@/utils/userDateTimeFormat";
import {
  addDaysToYmd,
  clampScheduleYmd,
  daysBetweenYmd,
  SCHEDULE_DAYS_AFTER,
  scheduleRangeLength,
  scheduleRangeStartYmd,
} from "@/utils/scheduleDateRange";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const GAP = 5;
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
type DayItem = { ymd: string; weekday: string; day: number };
type Props = {
  selectedYmd: string;
  todayYmd: string;
  signupYmd: string | null;
  onSelectYmd: (ymd: string) => void;
};

/** Same full date range as before, with a measured seven-day calendar strip. */
export default function ScheduleDateSelector({
  selectedYmd,
  todayYmd,
  signupYmd,
  onSelectYmd,
}: Props) {
  const Colors = useThemeColors();
  const styles = useThemeValues(getStyles);
  const { width } = useWindowDimensions();
  const { dateDisplay } = useUserDateTimePrefs();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const list = useRef<FlatList<DayItem>>(null);
  const start = scheduleRangeStartYmd(signupYmd, todayYmd);
  const end = addDaysToYmd(todayYmd, SCHEDULE_DAYS_AFTER);
  const selected = clampScheduleYmd(selectedYmd, start, end);
  const rowWidth = measuredWidth || Math.max(224, width - 64);
  const cardWidth = Math.max(28, (rowWidth - GAP * 6) / 7);
  const stride = cardWidth + GAP;
  const selectedIndex = daysBetweenYmd(start, selected);
  const locale = dateLocaleFor(dateDisplay);
  const selectedDate = useMemo(() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selected]);
  const days = useMemo(
    () =>
      Array.from(
        { length: scheduleRangeLength(start, todayYmd) },
        (_, index) => {
          const ymd = addDaysToYmd(start, index);
          const [y, m, d] = ymd.split("-").map(Number);
          const date = new Date(y, m - 1, d);
          return { ymd, weekday: WEEKDAY[date.getDay()], day: d };
        },
      ),
    [start, todayYmd],
  );

  const centerSelected = useCallback(
    (animated = false) => {
      list.current?.scrollToOffset({
        offset: selectedIndex * stride,
        animated,
      });
    },
    [selectedIndex, stride],
  );

  useEffect(() => {
    centerSelected(true);
  }, [centerSelected]);

  const shiftWeek = (delta: number) =>
    onSelectYmd(clampScheduleYmd(addDaysToYmd(selected, delta), start, end));
  return (
    <View style={styles.panel}>
      <View style={styles.monthRow}>
        <Text style={styles.month}>
          {selectedDate.toLocaleDateString(locale, {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <View style={styles.arrows}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            disabled={selected <= start}
            accessibilityState={{ disabled: selected <= start }}
            onPress={() => shiftWeek(-7)}
            style={[styles.arrow, selected <= start && styles.disabled]}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color={Colors.peachDark}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next week"
            disabled={selected >= end}
            accessibilityState={{ disabled: selected >= end }}
            onPress={() => shiftWeek(7)}
            style={[styles.arrow, selected >= end && styles.disabled]}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={Colors.peachDark}
            />
          </Pressable>
        </View>
      </View>
      <View
        onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      >
        <FlatList
          ref={list}
          data={days}
          keyExtractor={(item) => item.ymd}
          horizontal
          showsHorizontalScrollIndicator={false}
          extraData={selected}
          contentContainerStyle={{
            paddingHorizontal: Math.max(0, (rowWidth - cardWidth) / 2),
          }}
          getItemLayout={(_, index) => ({
            length: stride,
            offset: stride * index,
            index,
          })}
          initialScrollIndex={selectedIndex}
          onContentSizeChange={() => centerSelected(false)}
          onScrollToIndexFailed={() => centerSelected(false)}
          initialNumToRender={21}
          windowSize={7}
          maxToRenderPerBatch={14}
          removeClippedSubviews={false}
          renderItem={({ item }) => {
            const active = item.ymd === selected;
            const isToday = item.ymd === todayYmd;
            const [y, m, d] = item.ymd.split("-").map(Number);
            const label = new Date(y, m - 1, d).toLocaleDateString(locale, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            });
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}${isToday ? ", today" : ""}`}
                onPress={() => onSelectYmd(item.ymd)}
                style={[
                  styles.day,
                  { width: cardWidth, marginRight: GAP },
                  active && styles.selected,
                ]}
              >
                <Text style={[styles.weekday, active && styles.selectedText]}>
                  {item.weekday}
                </Text>
                <Text style={[styles.number, active && styles.selectedText]}>
                  {item.day}
                </Text>
                <View
                  style={[
                    styles.dot,
                    isToday && styles.todayDot,
                    active && styles.selectedDot,
                  ]}
                />
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const getStyles = createThemeValues((Colors) => StyleSheet.create({
  panel: { borderRadius: 24, backgroundColor: Colors.peach, padding: 12 },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 5,
    marginBottom: 7,
  },
  month: { fontFamily: Font.uiBold, fontSize: 14, color: Colors.textPrimary },
  arrows: { flexDirection: "row", gap: 2 },
  arrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.3 },
  day: {
    minHeight: 65,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 3,
  },
  selected: {
    backgroundColor: Colors.orange,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  weekday: {
    fontFamily: Font.uiSemiBold,
    fontSize: 11,
    color: Colors.peachDark,
  },
  number: { fontFamily: Font.uiBold, fontSize: 17, color: Colors.textPrimary },
  selectedText: { color: Colors.white },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },
  todayDot: { backgroundColor: Colors.peachDark },
  selectedDot: { backgroundColor: Colors.white },
}));
