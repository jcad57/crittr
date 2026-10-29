/** Shared geometry for expanded rings, minimized indicators, and their skeletons. */
export function dailyProgressLayout(width: number | null, count: number, compact = false) {
  const columns = Math.max(1, count);
  const dense = count >= 5;
  const preferredSize = compact ? 20 : dense ? 56 : 68;
  const preferredGap = compact ? dense ? 3 : 6 : dense ? 4 : 8;
  const available = Math.max(0, width ?? columns * preferredSize + (columns - 1) * preferredGap);
  const gap = Math.min(preferredGap, available / Math.max(1, columns * 2));
  const columnWidth = Math.max(0, (available - (columns - 1) * gap) / columns);
  const ringSize = Math.min(preferredSize, Math.floor(columnWidth));
  return {
    gap,
    columnWidth,
    ringSize,
    strokeWidth: Math.min(compact ? 3 : 8, Math.max(1, Math.round(ringSize * (compact ? 0.15 : 0.12))), ringSize / 2),
    iconSize: Math.round(ringSize * 26 / 68),
    labelSize: dense ? 11 : 12,
    fractionSize: dense ? 13 : 14,
    itemGap: dense ? 4 : 6,
  };
}
