/** Expo acceptance is a ticket; only a successful receipt confirms provider handoff. */
export type ExpoResult = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};
export class ExpoRequestError extends Error {
  constructor(message: string, public readonly retryable: boolean) { super(message); }
}
export async function requestExpo(
  endpoint: "send" | "getReceipts",
  body: unknown,
  accessToken?: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const response = await fetcher(`https://exp.host/--/api/v2/push/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new ExpoRequestError(`Expo HTTP ${response.status}`,
    response.status === 429 || response.status >= 500);
  const result = await response.json();
  if (!result || !result.data || result.errors?.length) throw new ExpoRequestError("Invalid Expo response", true);
  return result.data;
}
export function retryableExpoResult(result: ExpoResult): boolean {
  return !["DeviceNotRegistered", "MessageTooBig"].includes(result.details?.error ?? "");
}
