/**
 * Resolves with `undefined` if `promise` does not settle within `ms`.
 * The original work is not cancelled — callers use this to fail open rather
 * than block UI on a hung store / network call.
 *
 * After StoreKit / Play Billing sheets, iOS can delay a single `setTimeout`.
 * A short interval watching `Date.now()` is the backup so post-purchase UI
 * cannot spin forever if the timer is deferred.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  if (ms <= 0) return undefined;
  const deadline = Date.now() + ms;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        const expire = () => resolve(undefined);
        timer = setTimeout(expire, ms);
        interval = setInterval(() => {
          if (Date.now() >= deadline) expire();
        }, Math.min(250, ms));
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (interval !== undefined) clearInterval(interval);
  }
}
