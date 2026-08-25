/**
 * How long a callback waits for an idle moment before running anyway. Work
 * scheduled here is opportunistic, so this is a deadline rather than a delay:
 * a page that never goes idle still gets it, just late.
 */
const IDLE_TIMEOUT = 2000;

/**
 * Safari still doesn't ship `requestIdleCallback` — it exists only behind a
 * preference in Technology Preview — so it can't be called unguarded. Without
 * it, fall back to waiting out the same deadline the idle version is given:
 * there is no idle signal to time against.
 */
const supportsIdleCallback = typeof window.requestIdleCallback === "function";

/**
 * Runs `callback` once the main thread is free, or after {@link IDLE_TIMEOUT}.
 * Returns a handle for {@link cancelIdle}.
 */
export function requestIdle(callback: () => void): number {
  return supportsIdleCallback
    ? window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT })
    : window.setTimeout(callback, IDLE_TIMEOUT);
}

/** Cancels a handle returned by {@link requestIdle}. */
export function cancelIdle(handle: number): void {
  if (supportsIdleCallback) {
    window.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
}
