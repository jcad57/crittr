/** Native URLSession transfers bypass the Supabase fetch timeout. */
export async function runNativeFileTransfer<T>(
  start: () => Promise<T>,
  cancel: () => Promise<void>,
  timeoutMs = 150_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      start(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void cancel().catch(() => {});
          reject(
            new Error(
              "The file transfer timed out. Check your connection and try again.",
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
