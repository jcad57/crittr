export type WebsiteUpgradeIntent = {
  id: string;
  billing: "annual" | "monthly";
};

/** User-editable metadata controls navigation only. It never grants Pro. */
export function parseWebsiteUpgradeIntent(
  metadata: Record<string, unknown> | null | undefined,
): WebsiteUpgradeIntent | null {
  if (
    metadata?.upgrade_intent !== "pro" ||
    typeof metadata.upgrade_intent_id !== "string" ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(metadata.upgrade_intent_id) ||
    metadata.upgrade_intent_consumed_id === metadata.upgrade_intent_id
  )
    return null;
  return {
    id: metadata.upgrade_intent_id,
    billing:
      metadata.upgrade_intent_billing === "monthly" ? "monthly" : "annual",
  };
}
