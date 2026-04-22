/** Promise-based delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve `promise` or reject with a labelled timeout after `ms`.
 * The label is surfaced to the user, so prefer human-readable text
 * (e.g. `"Sign in"`, not `"signInWithEmail"`).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(`${label} timed out. Check your connection and try again.`),
      );
    }, ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}
