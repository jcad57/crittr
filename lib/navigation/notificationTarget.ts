/** Accept internal logged-in destinations only, including older payloads without an href. */
export function notificationTarget(data: Record<string, unknown> | null | undefined, userId: string): string | null {
  if (typeof data?.recipient_user_id === "string" && data.recipient_user_id !== userId) return null;
  const href = data?.href;
  if (typeof href !== "string") return "/(logged-in)/notifications";
  if (!href.startsWith("/(logged-in)/") || /[\\]|\.\.|\/\//.test(href)) return null;
  return href;
}
