/**
 * Display helpers for the in-app notifications screen.
 */

export function notificationIcon(type: string, isPro: boolean): string {
  if (type === "co_care_invite_requires_pro" && isPro) {
    return "account-plus-outline";
  }
  switch (type) {
    case "co_care_invite":
      return "account-plus-outline";
    case "co_care_invite_requires_pro":
      return "star-circle-outline";
    case "co_care_accepted":
      return "account-check-outline";
    case "co_care_removed":
      return "account-remove-outline";
    case "co_carer_activity_logged":
      return "run";
    default:
      return "bell-outline";
  }
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
