// Keep both the response and its body cancellable. Unlike Promise.race around
// sign-in, aborting the transport prevents an expired request completing later.
export const boundedFetch: typeof fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input);
  // File uploads can legitimately run longer; bound only Auth and database
  // requests so this login fix does not shorten the upload window.
  if (!/\/(auth|rest)\/v1(?:\/|\?|$)/.test(new URL(url).pathname)) return fetch(input, init);
  const callerSignal = init?.signal || (input instanceof Request ? input.signal : undefined);
  const deadline = AbortSignal.timeout(20_000);
  return fetch(input, {
    ...init,
    signal: callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline,
  });
};

// A session read can also wait for SDK initialization. This is read-only: a
// timeout must never clear credentials or log a successfully signed-in user out.
export async function waitForSession<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Your session could not be loaded. Please try again.")), 35_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
