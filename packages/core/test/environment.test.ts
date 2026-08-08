import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { shouldRethrowTimerErrors } from "../src/environment.ts";

describe("shouldRethrowTimerErrors", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("Node.js (main thread or worker_threads): no window, process.versions.node is a string -> rethrows", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", { versions: { node: "20.11.0" } });
    expect(shouldRethrowTimerErrors()).toBe(true);
  });

  test("browser main thread: window is defined, no process -> logs instead of rethrowing", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("process", undefined);
    expect(shouldRethrowTimerErrors()).toBe(false);
  });

  test("browser Worker: no window and no process at all -> logs instead of rethrowing", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", undefined);
    expect(shouldRethrowTimerErrors()).toBe(false);
  });

  test("Bun: no window, process.versions.node shimmed alongside process.versions.bun -> rethrows", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", { versions: { node: "20.11.0", bun: "1.1.0" } });
    expect(shouldRethrowTimerErrors()).toBe(true);
  });

  test("Deno: no window, process.versions.node shimmed alongside process.versions.deno -> rethrows", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", { versions: { node: "20.11.0", deno: "2.0.0" } });
    expect(shouldRethrowTimerErrors()).toBe(true);
  });

  test("process present without a versions.node string -> logs instead of rethrowing", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", { versions: {} });
    expect(shouldRethrowTimerErrors()).toBe(false);
  });

  test("Electron renderer process: window wins over process.versions.node -> logs instead of rethrowing", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("process", { versions: { node: "20.11.0", electron: "30.0.0" } });
    expect(shouldRethrowTimerErrors()).toBe(false);
  });

  test("Electron main process: no window, process.versions.node defined -> rethrows", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", { versions: { node: "20.11.0", electron: "30.0.0" } });
    expect(shouldRethrowTimerErrors()).toBe(true);
  });

  test("re-evaluates on every call rather than caching the first result", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("process", { versions: { node: "20.11.0" } });
    expect(shouldRethrowTimerErrors()).toBe(true);

    vi.stubGlobal("window", {});
    expect(shouldRethrowTimerErrors()).toBe(false);
  });
});
