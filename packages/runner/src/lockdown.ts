/** Worker globals that reach the network or spawn new execution contexts. */
export const BLOCKED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'WebTransport',
] as const;

const LOCKED = { value: undefined, writable: false, configurable: false, enumerable: false };

/**
 * Replace blocked globals with a non-configurable undefined on the scope and every prototype that defines them,
 * so neither `fetch` nor `Object.getPrototypeOf(self).fetch` works afterwards.
 * ponytail: dynamic import() and eval-built import() can't be blocked from inside the worker; the page must serve
 * the worker with a Content-Security-Policy (frontend plan).
 */
export function lockdown(scope: object): void {
  for (const name of BLOCKED_GLOBALS) {
    for (let o: object | null = Object.getPrototypeOf(scope); o; o = Object.getPrototypeOf(o)) {
      if (!Object.prototype.hasOwnProperty.call(o, name)) continue;
      try {
        Object.defineProperty(o, name, LOCKED);
      } catch {
        // Non-configurable host property: the own-property shadow below still hides it from `self.name`.
      }
    }
    try {
      Object.defineProperty(scope, name, LOCKED);
    } catch {
      // Already locked by an earlier call.
    }
  }
}
