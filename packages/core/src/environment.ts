/**
 * Wheter or not an uncaught exception in a timer callback should be rethrown rather than logged and swallowed.
 * This is intended to mimic the behavior of a browser or a node-like environment.
 */
export function shouldRethrowTimerErrors(): boolean {
  const runtimeGlobal = globalThis as {
    window?: unknown;
    process?: { versions?: { node?: unknown } };
  };
  return (
    typeof runtimeGlobal.window === "undefined" &&
    typeof runtimeGlobal.process?.versions?.node === "string"
  );
}
