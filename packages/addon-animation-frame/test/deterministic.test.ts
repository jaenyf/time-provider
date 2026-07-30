import { describe, expect, test } from "vite-plus/test";
import type { ITimeProvider, IScheduler, SetTimeoutHandle } from "@time-provider/core";
import { addon } from "../src/deterministic.ts";
import { DeterministicAnimationFrameScheduler } from "../src/deterministic-animation-frame.ts";

type FakeRuntime = ITimeProvider<unknown> & { animation?: unknown };

/*
 * applyToDeterministic only touches what it's documented to (define `.animation`,
 * read `.scheduler`), so a minimal object satisfies it for a focused unit test
 * without needing a real plugin/runtime - the cast is safe because these tests
 * never exercise anything else on the fake runtime.
 */
function fakeDeterministicRuntime(): {
  runtime: FakeRuntime;
  scheduled: Map<number, () => void>;
} {
  const scheduled = new Map<number, () => void>();
  let nextHandle = 1;
  const scheduler: IScheduler = {
    setTimeout(callback) {
      const handle = nextHandle++;
      scheduled.set(handle, callback);
      return handle as unknown as SetTimeoutHandle;
    },
    clearTimeout(handle) {
      scheduled.delete(handle as unknown as number);
    },
    setInterval() {
      throw new Error("not used by the animation-frame addon");
    },
    clearInterval() {
      throw new Error("not used by the animation-frame addon");
    },
  };
  return {
    runtime: { scheduler } as unknown as FakeRuntime,
    scheduled,
  };
}

describe("animationFrameAddon (deterministic)", () => {
  test("applyToDeterministic defines .animation with a DeterministicAnimationFrameScheduler", () => {
    const { runtime } = fakeDeterministicRuntime();
    addon.applyToDeterministic(runtime);
    expect(runtime.animation).toBeInstanceOf(DeterministicAnimationFrameScheduler);
  });

  test("applyToDeterministic wires .animation to the runtime's own scheduler", () => {
    const { runtime, scheduled } = fakeDeterministicRuntime();
    addon.applyToDeterministic(runtime);
    const scheduler = runtime.animation as DeterministicAnimationFrameScheduler;
    scheduler.requestAnimationFrame(() => {});
    expect(scheduled.size).toBe(1);
  });
});
