/** A timed-out UI must never start a second native transaction while the first is unresolved. */
export function createNativePurchaseGuard<T>() {
  let outstanding: { session: string; promise: Promise<T> } | null = null;
  return {
    pending: (session: string): Promise<T> | null => outstanding?.session === session ? outstanding.promise : null,
    run(session: string, action: () => Promise<T>): Promise<T> {
      if (outstanding) {
        if (outstanding.session === session) return outstanding.promise;
        return Promise.reject(Object.assign(new Error("A payment from the previous account is still finishing. Close the store sheet and check status before trying again."), { kind: "result_unknown" }));
      }
      const promise = Promise.resolve().then(action);
      const current = { session, promise };
      outstanding = current;
      const clear = () => { if (outstanding === current) outstanding = null; };
      void promise.then(clear, clear);
      return promise;
    },
  };
}
