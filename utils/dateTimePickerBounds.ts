/**
 * Bounds that every native date/time picker in the app must pass explicitly.
 *
 * `minimumDate`/`maximumDate` have no "unset" representation on the New
 * Architecture iOS picker. Codegen declares them as `double` defaulting to `0`,
 * and `RNDateTimePickerComponentView` turns that into `[NSDate
 * dateWithTimeIntervalSince1970:0]` — the Unix epoch. It also diffs incoming
 * props against `_props`, which is the *previous mount's* props because Fabric
 * recycles host views and `prepareForRecycle` does not reset them. So a picker
 * that omits a bound right after another picker set one is diffed as
 * `<someTimestamp> -> 0` and pins the wheel to the epoch (6:00 PM on Dec 31
 * 1969 in UTC-6): every other row greys out and scrolling snaps back.
 *
 * Passing both bounds on every picker, always, is what keeps that diff honest —
 * a real value can never be mistaken for "no constraint".
 */

/** Widest range any picker offers. Far enough out that no wheel row is clipped. */
export const PICKER_MIN_DATE = new Date(1900, 0, 1, 0, 0, 0, 0);
export const PICKER_MAX_DATE = new Date(2100, 11, 31, 23, 59, 59, 0);

export type PickerBoundsInput = {
  value: Date;
  minimumDate?: Date | null;
  maximumDate?: Date | null;
};

export type PickerBounds = {
  value: Date;
  minimumDate: Date;
  maximumDate: Date;
};

function isUsableDate(candidate: Date | null | undefined): candidate is Date {
  return candidate instanceof Date && Number.isFinite(candidate.getTime());
}

export function clampDateToRange(value: Date, min: Date, max: Date): Date {
  const time = value.getTime();
  if (time < min.getTime()) return new Date(min.getTime());
  if (time > max.getTime()) return new Date(max.getTime());
  return value;
}

/**
 * Fills in the wide defaults for missing bounds and clamps `value` inside them,
 * so a picker is never handed a selection its own bounds forbid.
 */
export function resolvePickerBounds({
  value,
  minimumDate,
  maximumDate,
}: PickerBoundsInput): PickerBounds {
  let min = isUsableDate(minimumDate) ? minimumDate : PICKER_MIN_DATE;
  let max = isUsableDate(maximumDate) ? maximumDate : PICKER_MAX_DATE;

  // An inverted range leaves at most one selectable instant, which is the same
  // lockup the epoch default caused. Widen rather than trap the user.
  if (min.getTime() > max.getTime()) {
    min = PICKER_MIN_DATE;
    max = PICKER_MAX_DATE;
  }

  return {
    value: clampDateToRange(isUsableDate(value) ? value : new Date(), min, max),
    minimumDate: min,
    maximumDate: max,
  };
}
