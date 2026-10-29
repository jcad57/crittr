import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { dailyProgressLayout } from "@/utils/dailyProgressLayout";

export function useDailyProgressLayout(count: number, compact: boolean) {
  const [width, setWidth] = useState<number | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);
  return { layout: dailyProgressLayout(width, count, compact), onLayout, measured: width !== null };
}
