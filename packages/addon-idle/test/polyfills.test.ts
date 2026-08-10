import { afterEach, describe, expect, test, vi } from "vite-plus/test";

describe("polyfills", () => {
  const originalRequestIdleCallback = globalThis.requestIdleCallback;
  const originalCancelIdleCallback = globalThis.cancelIdleCallback;

  afterEach(() => {
    globalThis.requestIdleCallback = originalRequestIdleCallback;
    globalThis.cancelIdleCallback = originalCancelIdleCallback;
  });

  test("installs a stub when requestIdleCallback/cancelIdleCallback are missing", async () => {
    delete (globalThis as { requestIdleCallback?: unknown }).requestIdleCallback;
    delete (globalThis as { cancelIdleCallback?: unknown }).cancelIdleCallback;

    vi.resetModules();
    await import("./polyfills.ts");

    expect(typeof globalThis.requestIdleCallback).toBe("function");
    expect(typeof globalThis.cancelIdleCallback).toBe("function");
    // The stubs are no-ops - just confirm they're safely callable.
    expect(() => globalThis.requestIdleCallback(() => {})).not.toThrow();
    expect(() => globalThis.cancelIdleCallback(0)).not.toThrow();
  });

  test("leaves an existing implementation alone", async () => {
    const existingRequestIdleCallback = () => 0;
    const existingCancelIdleCallback = () => {};
    globalThis.requestIdleCallback = existingRequestIdleCallback;
    globalThis.cancelIdleCallback = existingCancelIdleCallback;

    vi.resetModules();
    await import("./polyfills.ts");

    expect(globalThis.requestIdleCallback).toBe(existingRequestIdleCallback);
    expect(globalThis.cancelIdleCallback).toBe(existingCancelIdleCallback);
  });
});
