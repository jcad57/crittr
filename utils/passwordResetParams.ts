/** First string from an Expo Router search param (string | string[]). */
export function firstSearchParam(value?: string | string[]): string {
  return (Array.isArray(value) ? value[0] : value ?? "").trim();
}

/** `fromGuest=1` marks a reset that started while signed out. */
export function isFromGuestParam(value?: string | string[]): boolean {
  const v = firstSearchParam(value);
  return v === "1" || v === "true";
}

export function looksLikeEmail(value: string): boolean {
  const t = value.trim();
  const at = t.indexOf("@");
  return at > 0 && t.includes(".", at + 1) && !/\s/.test(t);
}
