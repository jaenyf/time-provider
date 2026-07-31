import { afterEach, describe, expect, test, vi } from "vite-plus/test";

describe("polyfills", () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  test("installs a stub when requestAnimationFrame/cancelAnimationFrame are missing", async () => {
    delete (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
    delete (globalThis as { cancelAnimationFrame?: unknown }).cancelAnimationFrame;

    vi.resetModules();
    await import("./polyfills.ts");

    expect(typeof globalThis.requestAnimationFrame).toBe("function");
    expect(typeof globalThis.cancelAnimationFrame).toBe("function");
    // The stubs are no-ops - just confirm they're safely callable.
    expect(() => globalThis.requestAnimationFrame(() => {})).not.toThrow();
    expect(() => globalThis.cancelAnimationFrame(0)).not.toThrow();
  });

  test("leaves an existing implementation alone", async () => {
    const existingRequestAnimationFrame = () => 0;
    const existingCancelAnimationFrame = () => {};
    globalThis.requestAnimationFrame = existingRequestAnimationFrame;
    globalThis.cancelAnimationFrame = existingCancelAnimationFrame;

    vi.resetModules();
    await import("./polyfills.ts");

    expect(globalThis.requestAnimationFrame).toBe(existingRequestAnimationFrame);
    expect(globalThis.cancelAnimationFrame).toBe(existingCancelAnimationFrame);
  });
});
