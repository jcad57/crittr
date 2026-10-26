/** Defer nonessential JS work until the next idle frame, with a bounded wait. */
export function runWhenIdle(work: () => void): { cancel: () => void } {
  const id = requestIdleCallback(work, { timeout: 500 });
  return { cancel: () => cancelIdleCallback(id) };
}
