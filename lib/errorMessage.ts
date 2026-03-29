/**
 * Supabase/PostgREST errors are often plain objects `{ message, code, details }`, not `Error`
 * instances — `String(e)` then shows "[object Object]".
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (typeof e === "object" && e !== null) {
    const o = e as Record<string, unknown>;
    if (typeof o.message === "string" && o.message.length > 0) return o.message;
    if (typeof o.details === "string" && o.details.length > 0) return o.details;
    if (typeof o.hint === "string" && o.hint.length > 0) return o.hint;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "Something went wrong.";
  }
}
