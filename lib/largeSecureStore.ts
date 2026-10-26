/** Generation-based storage: a failed replacement leaves the previous value readable. */
export type SecureStorage = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};
type Manifest = { __lss: 1 | 2; count: number; generation?: string };
function manifest(head: string | null): Manifest | null {
  try {
    const p = JSON.parse(head ?? "null");
    return (p?.__lss === 1 ||
      (p?.__lss === 2 && typeof p.generation === "string")) &&
      Number.isInteger(p.count) &&
      p.count > 0 &&
      p.count <= 512
      ? p
      : null;
  } catch {
    return null;
  }
}
export function splitUtf8(value: string, limit = 1800): string[] {
  const chunks: string[] = [];
  let chunk = "",
    size = 0;
  for (const char of value) {
    const point = char.codePointAt(0)!;
    const bytes =
      point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (size + bytes > limit) {
      chunks.push(chunk);
      chunk = "";
      size = 0;
    }
    chunk += char;
    size += bytes;
  }
  if (chunk || chunks.length === 0) chunks.push(chunk);
  return chunks;
}
export function createLargeSecureStore(storage: SecureStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  let serial = 0;
  const exclusive = <T>(action: () => Promise<T>): Promise<T> => {
    const next = queue.then(action, action);
    queue = next.catch(() => {});
    return next;
  };
  const chunkKey = (key: string, m: Manifest, i: number) =>
    m.__lss === 1 ? `${key}__lss__${i}` : `${key}__lss2__${m.generation}__${i}`;
  const clean = async (key: string, m: Manifest | null) => {
    if (m)
      await Promise.all(
        Array.from({ length: m.count }, (_, i) =>
          storage.deleteItemAsync(chunkKey(key, m, i)).catch(() => {}),
        ),
      );
  };
  return {
    getItem: (key: string): Promise<string | null> =>
      exclusive(async () => {
        const head = await storage.getItemAsync(key);
        const m = manifest(head);
        if (!m) return head;
        const parts = await Promise.all(
          Array.from({ length: m.count }, (_, i) =>
            storage.getItemAsync(chunkKey(key, m, i)),
          ),
        );
        return parts.some((p) => p == null) ? null : parts.join("");
      }),
    setItem: (key: string, value: string): Promise<void> =>
      exclusive(async () => {
        const previous = manifest(await storage.getItemAsync(key));
        const parts = splitUtf8(value);
        if (parts.length === 1) await storage.setItemAsync(key, value);
        else {
          if (parts.length > 512)
            throw new Error("Secure snapshot exceeds storage budget");
          const m: Manifest = {
            __lss: 2,
            count: parts.length,
            generation: `${Date.now()}_${serial++}`,
          };
          try {
            await Promise.all(
              parts.map((part, i) =>
                storage.setItemAsync(chunkKey(key, m, i), part),
              ),
            );
            await storage.setItemAsync(key, JSON.stringify(m));
          } catch (error) {
            await clean(key, m);
            throw error;
          }
        }
        await clean(key, previous);
      }),
    removeItem: (key: string): Promise<void> =>
      exclusive(async () => {
        const m = manifest(await storage.getItemAsync(key));
        await storage.deleteItemAsync(key); // Commit deletion before collecting chunks.
        await clean(key, m);
      }),
  };
}
