/**
 * Wheter or not an uncaught exception in a timer callback should be rethrown rather than logged and swallowed
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
