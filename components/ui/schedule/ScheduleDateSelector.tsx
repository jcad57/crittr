import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import { getLocalYmd } from "@/utils/localCalendarDate";
import {
  daysBetweenYmd,
  scheduleRangeLength,
  scheduleRangeStartYmd,
} from "@/utils/scheduleDateRange";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const DAY_CARD_WIDTH = 58;
const DAY_CARD_GAP = 6;
const ITEM_STRIDE = DAY_CARD_WIDTH + DAY_CARD_GAP;
/** Fixed narrow weekday letters — avoids `toLocaleDateString` × N on mount. */
const WEEKDAY_NARROW = ["Su", "M", "T", "W", "Th", "F", "S"] as const;

type DayItem = {
  key: string;
  ymd: string;
  weekdayLetter: string;
  dayNum: number;
};

type DayRangeCache = {
  key: string;
  days: DayItem[];
};

let dayRangeCache: DayRangeCache | null = null;

function parseYmdParts(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return [y!, m!, d!];
}

function buildDayRange(startYmd: string, todayYmd: string): DayItem[] {
  const [y, m, d] = parseYmdParts(startYmd);
  const out: DayItem[] = new Array(scheduleRangeLength(startYmd, todayYmd));
  for (let i = 0; i < out.length; i++) {
    const dt = new Date(y, m - 1, d + i);
    const ymd = getLocalYmd(dt);
    out[i] = {
      key: ymd,
      ymd,
      weekdayLetter: WEEKDAY_NARROW[dt.getDay()]!,
      dayNum: dt.getDate(),
    };
  }
  return out;
}

function getDayRange(startYmd: string, todayYmd: string): DayItem[] {
  const key = `${startYmd}|${todayYmd}`;
  if (dayRangeCache?.key === key) return dayRangeCache.days;
  const days = buildDayRange(startYmd, todayYmd);
  dayRangeCache = { key, days };
  return days;
}

type Props = {
  selectedYmd: string;
  /** Live local day from the parent, so the "today" ring survives a midnight rollover. */
  todayYmd: string;
  /** Day the user signed up — the first selectable card. Null until it resolves. */
  signupYmd: string | null;
  onSelectYmd: (ymd: string) => void;
};

export default function ScheduleDateSelector({
  selectedYmd,
  todayYmd,
  signupYmd,
  onSelectYmd,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<DayItem>>(null);

  const startYmd = useMemo(
    () => scheduleRangeStartYmd(signupYmd, todayYmd),
    [signupYmd, todayYmd],
  );
  const days = useMemo(
    () => getDayRange(startYmd, todayYmd),
    [startYmd, todayYmd],
  );

  const sidePad = Math.max(0, (windowWidth - DAY_CARD_WIDTH) / 2);
  /** Stable identity — a fresh style object here re-lays out the row on every parent render. */
  const contentContainerStyle = useMemo(
    () => ({ paddingHorizontal: sidePad }),
    [sidePad],
  );

  const selectedIndex = useMemo(() => {
    const idx = daysBetweenYmd(startYmd, selectedYmd);
    return Math.min(Math.max(idx, 0), days.length - 1);
  }, [days.length, selectedYmd, startYmd]);

  const scrollToIndex = useCallback((index: number, animated: boolean) => {
    listRef.current?.scrollToOffset({
      offset: Math.max(0, index * ITEM_STRIDE),
      animated,
    });
  }, []);

  /**
   * Centring has to wait for the row to actually have a measured width.
   * This used to run on a `setTimeout(0)`, which on a cold start can fire
   * before layout — iOS then clamps the offset to whatever content exists at
   * that moment, stranding the strip at today with no way to scroll back.
   */
  const anchorPendingRef = useRef(true);
  const selectedIndexRef = useRef(selectedIndex);
  selectedIndexRef.current = selectedIndex;

  const anchorToSelected = useCallback(() => {
    if (!anchorPendingRef.current) return;
    anchorPendingRef.current = false;
    scrollToIndex(selectedIndexRef.current, false);
  }, [scrollToIndex]);

  /** Every index shifts when the range origin moves (e.g. signup date resolves late). */
  useEffect(() => {
    anchorPendingRef.current = true;
    scrollToIndex(selectedIndexRef.current, false);
  }, [startYmd, scrollToIndex]);

  /** Center the selected card after a programmatic selection change. */
  useEffect(() => {
    if (anchorPendingRef.current) return;
    scrollToIndex(selectedIndex, true);
  }, [selectedYmd, selectedIndex, scrollToIndex]);

  const onPressDay = useCallback(
    (item: DayItem) => {
      const idx = daysBetweenYmd(startYmd, item.ymd);
      if (idx >= 0 && idx < days.length) {
        /** Center immediately on tap — don't wait for parent schedule fetch. */
        scrollToIndex(idx, true);
      }
      onSelectYmd(item.ymd);
    },
    [days.length, onSelectYmd, scrollToIndex, startYmd],
  );

  const renderItem = useCallback(
    ({ item }: { item: DayItem }) => {
      const selected = item.ymd === selectedYmd;
      const isToday = item.ymd === todayYmd;
      return (
        <Pressable
          onPress={() => onPressDay(item)}
          style={[
            styles.card,
            selected && styles.cardSelected,
            isToday && styles.cardToday,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${item.weekdayLetter} ${item.dayNum}${isToday ? ", today" : ""}`}
        >
          <Text style={[styles.letter, selected && styles.textSelected]}>
            {item.weekdayLetter}
          </Text>
          <Text style={[styles.dayNum, selected && styles.textSelected]}>
            {item.dayNum}
          </Text>
        </Pressable>
      );
    },
    [onPressDay, selectedYmd, todayYmd],
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={days}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        extraData={selectedYmd}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_STRIDE}
        decelerationRate="fast"
        contentContainerStyle={contentContainerStyle}
        getItemLayout={(_data, index) => ({
          length: ITEM_STRIDE,
          offset: ITEM_STRIDE * index,
          index,
        })}
        onContentSizeChange={anchorToSelected}
        onScrollToIndexFailed={({ index }) => {
          /** Layout wasn't ready; `getItemLayout` gives us the offset directly. */
          scrollToIndex(index, false);
        }}
        initialNumToRender={15}
        windowSize={7}
        maxToRenderPerBatch={11}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: -20,
  },
  card: {
    width: DAY_CARD_WIDTH,
    marginRight: DAY_CARD_GAP,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardSelected: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  cardToday: {
    borderColor: Colors.gray600,
  },
  letter: {
    fontFamily: Font.uiMedium,
    fontSize: 13,
    color: Colors.gray400,
  },
  dayNum: {
    fontFamily: Font.uiSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  textSelected: {
    color: Colors.white,
  },
});
