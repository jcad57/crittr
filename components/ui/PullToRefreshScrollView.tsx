import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { forwardRef } from "react";
import {
  ScrollView,
  type ScrollViewProps,
} from "react-native";

export type PullToRefreshScrollViewProps = ScrollViewProps & {
  /** Runs when the user pulls far enough; indicator stays until this completes. */
  onRefresh: () => void | Promise<void>;
};

/**
 * `ScrollView` with pull-to-refresh wired through {@link usePullToRefresh}.
 * For `FlatList` / `SectionList`, use `usePullToRefresh` and pass `refreshControl` yourself.
 */
const PullToRefreshScrollView = forwardRef<
  ScrollView,
  PullToRefreshScrollViewProps
>(function PullToRefreshScrollView(
  { onRefresh, refreshControl: _ignore, children, ...rest },
  ref,
) {
  const { refreshControl } = usePullToRefresh(onRefresh);
  return (
    <ScrollView ref={ref} {...rest} refreshControl={refreshControl}>
      {children}
    </ScrollView>
  );
});

export default PullToRefreshScrollView;
