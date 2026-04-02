import { Colors } from "@/constants/colors";
import { useCallback, useMemo, useState, type ReactElement } from "react";
import {
  InteractionManager,
  Platform,
  RefreshControl,
  type RefreshControlProps,
} from "react-native";

const DEFAULT_ANDROID_COLORS = [Colors.orange];

export type UsePullToRefreshOptions = {
  /** Spinner / tint (defaults to brand orange). */
  tintColor?: string;
  /** Android progress ring colors. */
  androidColors?: string[];
  /** Android circle background behind the indicator. */
  progressBackgroundColor?: string;
};

/**
 * Pull-to-refresh state + `RefreshControl` for `ScrollView`, `FlatList`, or `SectionList`.
 *
 * On **iOS**, the actual `refresh()` call runs after
 * `InteractionManager.runAfterInteractions` and the next animation frame so work
 * does not start in the same turn as the release gesture (closer to native
 * `UIRefreshControl` feel). Android runs the fetch immediately when `onRefresh`
 * fires.
 *
 * @example
 * const { refreshControl } = usePullToRefresh(
 *   useCallback(async () => {
 *     await Promise.all([petsQuery.refetch(), detailsQuery.refetch()]);
 *   }, [petsQuery, detailsQuery]),
 * );
 * return <ScrollView refreshControl={refreshControl}>…</ScrollView>;
 */
export function usePullToRefresh(
  refresh: () => void | Promise<void>,
  options?: UsePullToRefreshOptions,
): {
  refreshing: boolean;
  onRefresh: () => void;
  refreshControl: ReactElement<RefreshControlProps>;
} {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const runFetch = () => {
      Promise.resolve(refresh()).finally(() => {
        setRefreshing(false);
      });
    };

    // iOS: `onRefresh` can fire in the same tick as the release event; starting
    // network work immediately feels like a fetch mid–pull. Defer until after
    // the scroll view / refresh control finishes the current interaction cycle
    // (same pattern as native UIRefreshControl timing).
    if (Platform.OS === "ios") {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(runFetch);
      });
    } else {
      runFetch();
    }
  }, [refresh]);

  const tintColor = options?.tintColor ?? Colors.orange;
  const androidColors = options?.androidColors ?? DEFAULT_ANDROID_COLORS;
  const progressBackgroundColor =
    options?.progressBackgroundColor ?? Colors.cream;

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={tintColor}
        colors={androidColors}
        progressBackgroundColor={progressBackgroundColor}
      />
    ),
    [
      refreshing,
      onRefresh,
      tintColor,
      androidColors,
      progressBackgroundColor,
    ],
  );

  return { refreshing, onRefresh, refreshControl };
}
