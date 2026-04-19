import { Colors } from "@/constants/colors";
import { Font } from "@/constants/typography";
import type { ActivityFilterCategory } from "@/data/activityHistory";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

/** YYYY-MM-DD in local calendar. */
function toLocalIsoDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateFilterLabel(ymd: string): string {
  const [yy, mm, dd] = ymd.split("-").map(Number);
  if (!yy || !mm || !dd) return ymd;
  return new Date(yy, mm - 1, dd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const FILTER_ITEMS: { id: ActivityFilterCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "exercise", label: "Exercise" },
  { id: "meals", label: "Meals" },
  { id: "treats", label: "Treats" },
  { id: "meds", label: "Meds" },
  { id: "vet_visit", label: "Vet visits" },
  { id: "training", label: "Training" },
];

const SORT_OPTIONS: { label: string; newestFirst: boolean }[] = [
  { label: "Newest first", newestFirst: true },
  { label: "Oldest first", newestFirst: false },
];

const PANEL_WIDTH = 200;

type Menu = "filter" | "sort" | null;

type Anchor = { x: number; y: number; width: number; height: number };

type Props = {
  filter: ActivityFilterCategory;
  onFilterChange: (id: ActivityFilterCategory) => void;
  newestFirst: boolean;
  onNewestFirstChange: (value: boolean) => void;
  /** `YYYY-MM-DD` local, or `null` for all dates. */
  dateFilterYmd: string | null;
  onDateFilterChange: (ymd: string | null) => void;
};

export default function ActivityHistoryFilterBar({
  filter,
  onFilterChange,
  newestFirst,
  onNewestFirstChange,
  dateFilterYmd,
  onDateFilterChange,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [menu, setMenu] = useState<Menu>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const filterRef = useRef<View>(null);
  const sortRef = useRef<View>(null);

  const dismiss = useCallback(() => {
    setMenu(null);
    setAnchor(null);
  }, []);

  const filterLabel =
    FILTER_ITEMS.find((f) => f.id === filter)?.label ?? "All";

  const sortLabel = newestFirst ? "Newest first" : "Oldest first";

  const datePickerValue = useMemo(() => {
    if (!dateFilterYmd) return new Date();
    const [y, m, d] = dateFilterYmd.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [dateFilterYmd]);

  const dateTriggerLabel =
    dateFilterYmd != null
      ? formatDateFilterLabel(dateFilterYmd)
      : "Any date";

  const openFilter = () => {
    if (menu === "filter") {
      dismiss();
      return;
    }
    filterRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setMenu("filter");
    });
  };

  const openSort = () => {
    if (menu === "sort") {
      dismiss();
      return;
    }
    sortRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setMenu("sort");
    });
  };

  const openDatePicker = () => {
    dismiss();
    setDatePickerOpen(true);
  };

  const handleDateConfirm = (picked: Date) => {
    setDatePickerOpen(false);
    onDateFilterChange(toLocalIsoDateString(picked));
  };

  const handleDateCancel = useCallback(() => {
    setDatePickerOpen(false);
  }, []);

  const panelLeft = anchor
    ? Math.min(
        Math.max(16, anchor.x + anchor.width - PANEL_WIDTH),
        windowWidth - PANEL_WIDTH - 16,
      )
    : 0;

  const panelTop = anchor ? anchor.y + anchor.height + 4 : 0;

  return (
    <View style={styles.outer}>
      <View style={styles.rowRight}>
        <View
          ref={filterRef}
          collapsable={false}
          style={styles.menuCol}
        >
          <Pressable
            style={[styles.trigger, menu === "filter" && styles.triggerOpen]}
            onPress={openFilter}
            accessibilityRole="button"
            accessibilityLabel="Filter activity type"
            accessibilityState={{ expanded: menu === "filter" }}
          >
            <Text style={styles.triggerText} numberOfLines={1}>
              {filterLabel}
            </Text>
            <MaterialCommunityIcons
              name={menu === "filter" ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.gray500}
            />
          </Pressable>
        </View>

        <View ref={sortRef} collapsable={false} style={styles.menuCol}>
          <Pressable
            style={[styles.trigger, menu === "sort" && styles.triggerOpen]}
            onPress={openSort}
            accessibilityRole="button"
            accessibilityLabel="Sort by date"
            accessibilityState={{ expanded: menu === "sort" }}
          >
            <Text style={styles.triggerText} numberOfLines={1}>
              {sortLabel}
            </Text>
            <MaterialCommunityIcons
              name={menu === "sort" ? "chevron-up" : "chevron-down"}
              size={18}
              color={Colors.gray500}
            />
          </Pressable>
        </View>

        <View collapsable={false} style={[styles.menuCol, styles.dateTriggerWrap]}>
          <Pressable
            style={[
              styles.trigger,
              datePickerOpen && styles.triggerOpen,
              dateFilterYmd != null && styles.triggerHasValue,
            ]}
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel="Filter by date"
          >
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={18}
              color={dateFilterYmd != null ? Colors.orange : Colors.gray500}
            />
            <Text style={styles.triggerText} numberOfLines={1}>
              {dateTriggerLabel}
            </Text>
          </Pressable>
          {dateFilterYmd != null ? (
            <Pressable
              style={styles.dateClearHit}
              onPress={() => onDateFilterChange(null)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear date filter"
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={Colors.gray400}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <DateTimePickerModal
        isVisible={datePickerOpen}
        mode="date"
        date={datePickerValue}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        confirmTextIOS="Set filter"
        cancelTextIOS="Cancel"
        buttonTextColorIOS={Colors.orange}
      />

      <Modal
        visible={menu !== null && anchor !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <View style={styles.modalRoot} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={dismiss}
            accessibilityLabel="Dismiss menu"
          />
          {anchor && menu === "filter" ? (
            <View
              style={[
                styles.modalPanel,
                { top: panelTop, left: panelLeft, width: PANEL_WIDTH },
              ]}
              pointerEvents="box-none"
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.panelScroll}
                nestedScrollEnabled
              >
                {FILTER_ITEMS.map((item, index) => {
                  const selected = item.id === filter;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.option,
                        index > 0 && styles.optionBorderTop,
                        selected && styles.optionActive,
                      ]}
                      onPress={() => {
                        onFilterChange(item.id);
                        dismiss();
                      }}
                      activeOpacity={0.65}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {selected ? (
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color={Colors.orange}
                        />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {anchor && menu === "sort" ? (
            <View
              style={[
                styles.modalPanel,
                { top: panelTop, left: panelLeft, width: PANEL_WIDTH },
              ]}
              pointerEvents="box-none"
            >
              {SORT_OPTIONS.map((opt, index) => {
                const selected = opt.newestFirst === newestFirst;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.option,
                      index > 0 && styles.optionBorderTop,
                      selected && styles.optionActive,
                    ]}
                    onPress={() => {
                      onNewestFirstChange(opt.newestFirst);
                      dismiss();
                    }}
                    activeOpacity={0.65}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selected && styles.optionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {selected ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={16}
                        color={Colors.orange}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
  },
  rowRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    gap: 8,
    width: "100%",
  },
  menuCol: {
    flexShrink: 0,
  },
  dateTriggerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateClearHit: {
    paddingVertical: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 100,
    maxWidth: 168,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
  },
  triggerHasValue: {
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeLight,
  },
  triggerOpen: {
    borderColor: Colors.orange,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  triggerText: {
    flex: 1,
    fontFamily: Font.uiSemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  modalPanel: {
    position: "absolute",
    borderWidth: 1,
    borderColor: Colors.orange,
    borderRadius: 12,
    backgroundColor: Colors.white,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: { elevation: 12 },
    }),
  },
  panelScroll: {
    maxHeight: 220,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.gray100,
  },
  optionActive: {
    backgroundColor: Colors.orangeLight,
  },
  optionText: {
    flex: 1,
    fontFamily: Font.uiRegular,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingRight: 8,
  },
  optionTextActive: {
    fontFamily: Font.uiSemiBold,
    color: Colors.orangeDark,
  },
});
