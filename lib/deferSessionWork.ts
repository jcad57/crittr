import { runWhenIdle } from "@/lib/runWhenIdle";
import { sessionGeneration } from "@/lib/sessionGeneration";

/** Let the selected dashboard paint before background maintenance starts. */
export function deferSessionWork(
  work: () => Promise<unknown>,
  delay = 2000,
): () => void {
  const generation = sessionGeneration();
  let idle: ReturnType<typeof runWhenIdle> | undefined;
  const timer = setTimeout(() => {
    idle = runWhenIdle(() => {
      if (generation === sessionGeneration())
        void work().catch((error) => {
          if (__DEV__) console.warn("[sessionMaintenance]", error);
        });
    });
  }, delay);
  return () => {
    clearTimeout(timer);
    idle?.cancel();
  };
}
