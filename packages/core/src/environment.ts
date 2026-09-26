/** Whether timer errors are rethrown in Node-like runtimes. */
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
