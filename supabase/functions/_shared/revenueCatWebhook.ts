export type RevenueCatEvent = {
  id: string;
  type: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  transferred_from?: string[];
  transferred_to?: string[];
};
const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
/** Webhooks are authenticated server input, but every account is fetched separately. */
export function affectedAccountIds(event: RevenueCatEvent): string[] {
  const candidates =
    event.type === "TRANSFER"
      ? [
          ...(Array.isArray(event.transferred_from)
            ? event.transferred_from
            : []),
          ...(Array.isArray(event.transferred_to) ? event.transferred_to : []),
        ]
      : [
          event.app_user_id,
          event.original_app_user_id,
          ...(Array.isArray(event.aliases) ? event.aliases : []),
        ];
  return [...new Set(candidates.filter(isUuid))];
}
