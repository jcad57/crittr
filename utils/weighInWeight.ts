/** Match form validation to the numeric(8,2) weight saved by the database. */
export function parseWeighInWeight(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Math.round(Number(normalized) * 100) / 100;
  return Number.isFinite(value) && value > 0 && value <= 999999.99 ? value : null;
}

export function weighInSaveErrorMessage(error: unknown): string {
  const failure = error as { code?: string; message?: string } | null;
  if (failure?.code === "42501") return "You don’t have permission to save this pet’s weight. Ask the pet owner to check your access.";
  if (failure?.code === "PGRST202" || failure?.code === "42883") return "Weigh-in saving is temporarily unavailable. Please contact Crittr support and try again later.";
  return "We couldn’t save this weigh-in. Check your connection and try again. Your entries are still here.";
}
