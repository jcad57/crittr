/**
 * Treats: explicit `is_treat` from the DB, or portion counted in pieces
 * (e.g. onboarding "Piece(s)") — used for daily progress and profile display.
 */
export function isTreatFood(f: {
  is_treat: boolean;
  portion_unit: string | null;
}): boolean {
  if (f.is_treat) return true;
  const u = f.portion_unit?.trim() ?? "";
  if (!u) return false;
  return /piece/i.test(u);
}

type TreatTargetFields = {
  is_treat: boolean;
  portion_size: string | null;
  portion_unit: string | null;
};

/**
 * Daily progress ring total for treats: for piece-based treats, uses the numeric
 * portion amount (e.g. 4 + Piece(s) → 4). Non–piece treats count as 1 each.
 */
export function treatDailyTarget(f: TreatTargetFields): number {
  if (!isTreatFood(f)) return 0;
  const unit = f.portion_unit?.trim() ?? "";
  const isPieceUnit = /piece/i.test(unit);
  if (isPieceUnit) {
    const raw = f.portion_size?.trim() ?? "";
    if (raw === "") return 1;
    const n = parseFloat(raw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return 1;
    return Math.max(0, Math.round(n));
  }
  return 1;
}
