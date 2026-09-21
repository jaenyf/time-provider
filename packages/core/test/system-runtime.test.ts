import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { BaseSystemRuntime } from "../src/runtimes/system-runtime.ts";
import {
  type EpochMilliseconds,
  type IScheduledHandle,
  type ITimeConverter,
} from "../src/types/types.ts";
import { ScheduledHandle } from "../src/runtimes/scheduled-handle.ts";

// Mirrors the chunk size BaseSystemRuntime arms long delays in - the largest delay a native timer
// can hold. See MAX_NATIVE_DELAY in system-runtime.ts.
const MAX_NATIVE_DELAY = 2_147_483_647;

const noopConverter: ITimeConverter<unknown> = {
  convertToTimestamp: () => 0 as EpochMilliseconds,
  convertToUtcDate: (time) => time,
  convertToLocalDate: (_timezone, time) => time,
};

class FakeSystemRuntime extends BaseSystemRuntime<unknown> {
  constructor() {
    super("Etc/UTC", noopConverter);
  }
  timestampNow(): EpochMilliseconds {
    return 0 as EpochMilliseconds;
  }
  localNow(): unknown {
    return 0;
  }
  utcNow(): unknown {
    return 0;
  }
}

describe("BaseSystemRuntime", () => {
  let sut: FakeSystemRuntime;

  beforeEach(() => {
    sut = new FakeSystemRuntime();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("once", () => {
    test.each([undefined, -1, -100])(
      "clamps a %s delay to 0 before scheduling",
      (delay: number | undefined) => {
        const spy = vi.spyOn(globalThis, "setTimeout");
        sut.once({ milliseconds: delay }, () => {});
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 0);
      },
    );

    test("leaves a non-negative delay untouched", () => {
      const spy = vi.spyOn(globalThis, "setTimeout");
      sut.once({ milliseconds: 42 }, () => {});
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 42);
    });

    test("arms a delay past the native limit in chunks rather than letting the clock clamp it", () => {
      const spy = vi.spyOn(globalThis, "setTimeout");
      let called = false;
      sut.once({ milliseconds: MAX_NATIVE_DELAY + 5 }, () => {
        called = true;
      });

      expect(spy).toHaveBeenCalledWith(expect.any(Function), MAX_NATIVE_DELAY);
      // A clamped delay is due after 1ms, so this is what firing early looks like.
      vi.advanceTimersByTime(1);
      expect(called).toBe(false);
      vi.advanceTimersToNextTimer();
      expect(called).toBe(false);
      vi.advanceTimersToNextTimer();
      expect(called).toBe(true);
    });

    test("cancels a chunked delay disposed before it is due", () => {
      let called = false;
      const handle = sut.once({ milliseconds: MAX_NATIVE_DELAY * 2 }, () => {
        called = true;
      });

      vi.advanceTimersToNextTimer();
      handle.dispose();
      vi.advanceTimersToNextTimer();
      expect(called).toBe(false);
      expect(vi.getTimerCount()).toEqual(0);
    });
  });

  describe("every", () => {
    test.each([undefined, -1, 0])(
      "clamps a %s delay to 1 before scheduling",
      (delay: number | undefined) => {
        const spy = vi.spyOn(globalThis, "setInterval");
        sut.every({ milliseconds: delay }, () => {});
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 1);
      },
    );

    test("leaves a delay of 1 or more untouched", () => {
      const spy = vi.spyOn(globalThis, "setInterval");
      sut.every({ milliseconds: 42 }, () => {});
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 42);
    });

    test("re-arms a period past the native limit rather than letting the clock clamp it", () => {
      const spy = vi.spyOn(globalThis, "setInterval");
      let callbackCounts = 0;
      sut.every({ milliseconds: MAX_NATIVE_DELAY + 5 }, () => {
        ++callbackCounts;
      });

      expect(spy).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(callbackCounts).toEqual(0);
      vi.advanceTimersToNextTimer();
      vi.advanceTimersToNextTimer();
      expect(callbackCounts).toEqual(1);
      vi.advanceTimersToNextTimer();
      vi.advanceTimersToNextTimer();
      expect(callbackCounts).toEqual(2);
    });

    test("stops a re-armed period when the callback disposes its own handle", () => {
      let callbackCounts = 0;
      let handle: ReturnType<typeof sut.every>;
      handle = sut.every({ milliseconds: MAX_NATIVE_DELAY + 5 }, () => {
        ++callbackCounts;
        handle.dispose();
      });

      vi.advanceTimersToNextTimer();
      expect(callbackCounts).toEqual(0);
      vi.advanceTimersToNextTimer();
      expect(callbackCounts).toEqual(1);
      expect(vi.getTimerCount()).toEqual(0);
    });
  });

  describe("recurring", () => {
    test.each([undefined, -1, 0])(
      "an %s delay still recurs (~1 run per ms), same as setTimeout's own clamp for the first run",
      (delay: number | undefined) => {
        let callbackCounts = 0;
        sut.recurring(
          () => {
            ++callbackCounts;
            return { milliseconds: delay };
          },
          { milliseconds: delay },
        );
        vi.advanceTimersByTime(8);
        expect(callbackCounts).toEqual(8 + 1);
      },
    );

    test.each([2, 42, 100])("leaves a delay of 1 or more untouched", (delay) => {
      let callbackCounts = 0;
      sut.recurring(
        () => {
          ++callbackCounts;
          return { milliseconds: delay };
        },
        { milliseconds: delay },
      );
      vi.advanceTimersByTime(delay);
      expect(callbackCounts).toEqual(1);
    });

    test.each([4, 42, 100])("cancels dynamic intervals when callback returns false", (delay) => {
      let callbackCounts = 0;
      sut.recurring(
        () => {
          ++callbackCounts;
          return callbackCounts < 3 ? { milliseconds: delay } : false;
        },
        { milliseconds: delay },
      );
      vi.advanceTimersByTime(delay * 4);
      expect(callbackCounts).toEqual(3);
    });

    test("arms a delay past the native limit in chunks, for the first run and every rearm", () => {
      let callbackCounts = 0;
      sut.recurring(
        () => {
          ++callbackCounts;
          return { milliseconds: MAX_NATIVE_DELAY + 5 };
        },
        { milliseconds: MAX_NATIVE_DELAY + 5 },
      );

      vi.advanceTimersByTime(1);
      expect(callbackCounts).toEqual(0);
      vi.advanceTimersToNextTimer();
      vi.advanceTimersToNextTimer();
      expect(callbackCounts).toEqual(1);
      vi.advanceTimersToNextTimer();
      vi.advanceTimersToNextTimer();
      expect(callbackCounts).toEqual(2);
    });

    test("disposes the handle and rethrows when the callback throws, same as returning false", () => {
      const error = new Error("boom");
      const handle = sut.recurring(
        () => {
          throw error;
        },
        { milliseconds: 10 },
      );
      expect(() => vi.advanceTimersByTime(10)).toThrow(error);
      expect(handle.isDisposed).toBe(true);
    });

    test("still rethrows in a browser-like environment, unlike a deterministic runtime", () => {
      /*
        A deterministic runtime reads shouldRethrowTimerErrors() and emulates the host: it
        rethrows under Node and logs via console.error under a browser. A system runtime never
        consults it, because the callback already runs inside a native timer and the host's own
        semantics apply on their own. Rethrowing here is how that reaches the host, so the
        asymmetry is the point, not an oversight.
      */
      vi.stubGlobal("window", {});
      vi.stubGlobal("process", undefined);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("boom");
      const handle = sut.recurring(
        () => {
          throw error;
        },
        { milliseconds: 10 },
      );

      expect(() => vi.advanceTimersByTime(10)).toThrow(error);
      expect(handle.isDisposed).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("clearing recurring", () => {
    test("cancels the schedule when called reentrantly from inside the callback itself", () => {
      let callbackCounts = 0;
      let handle: ReturnType<typeof sut.recurring>;
      handle = sut.recurring(
        () => {
          ++callbackCounts;
          handle.dispose();
          return { milliseconds: 10 };
        },
        { milliseconds: 10 },
      );
      vi.advanceTimersByTime(100);
      expect(callbackCounts).toEqual(1);
    });

    test.each([4, 42, 100])("cancels pending recurring callback", (delay) => {
      let callbackCounts = 0;
      const handle = sut.recurring(
        () => {
          ++callbackCounts;
          return callbackCounts < 3 ? { milliseconds: delay } : false;
        },
        { milliseconds: delay },
      );
      handle.dispose();
      vi.advanceTimersByTime(1);
      expect(callbackCounts).toEqual(0);
    });
  });

  describe("on real timers", () => {
    /*
      The fake clock the rest of this file runs on reproduces the clamp itself, but not the
      TimeoutOverflowWarning Node prints alongside it - which is the symptom that surfaced this,
      out of the addon-cron e2e tests. These arm a real timer and assert the warning stays silent.
    */
    const arming: [string, (delay: { milliseconds: number }) => IScheduledHandle][] = [
      ["once", (delay) => sut.once(delay, () => {})],
      ["every", (delay) => sut.every(delay, () => {})],
      ["recurring", (delay) => sut.recurring(() => false, delay)],
    ];

    test.each(arming)(
      "%s keeps a delay past the native limit from being clamped",
      async (_, arm) => {
        vi.useRealTimers();
        const warnings: string[] = [];
        const onWarning = (warning: Error): void => {
          warnings.push(`${warning.name}: ${warning.message}`);
        };
        process.on("warning", onWarning);
        try {
          arm({ milliseconds: MAX_NATIVE_DELAY + 1 }).dispose();
          // process.emitWarning defers to the next tick, so let the loop turn before looking.
          await new Promise((resolve) => setTimeout(resolve, 0));
        } finally {
          process.off("warning", onWarning);
        }

        expect(warnings.filter((warning) => warning.startsWith("TimeoutOverflowWarning"))).toEqual(
          [],
        );
      },
    );
  });

  describe("clearTimer", () => {
    test.each([-1, 4, 5, 6])("throws when trying to clear unexpected kind", (wrongKind) => {
      const handleWithWrongKind = {
        kind: wrongKind,
        nativeHandle: undefined,
        isDisposed: false,
      } as ScheduledHandle<unknown, unknown>;
      expect(() => {
        //@ts-ignore : wrong cast
        sut.clearTimer(handleWithWrongKind as TimerHandle<unknown, unknown>);
      }).toThrow("Invalid operation");
    });
  });

  describe("queue", () => {
    test("hands the callback to the host's own microtask queue", async () => {
      const log: string[] = [];
      sut.queue(() => log.push("queued"));

      // A system runtime defers to the host, so nothing has run while the stack is still up.
      expect(log).toEqual([]);
      await Promise.resolve();
      expect(log).toEqual(["queued"]);
    });

    test("shares one FIFO queue with promise continuations, as the host does", async () => {
      const log: string[] = [];
      void Promise.resolve().then(() => log.push("promise"));
      sut.queue(() => log.push("microtask"));

      await Promise.resolve();
      expect(log).toEqual(["promise", "microtask"]);
    });

    test("still runs even after the runtime that queued it is disposed", async () => {
      // Unlike a deterministic runtime, dispose() has no way to reach into the host's own
      // microtask queue and cancel this - see BaseSystemRuntime.queue.
      let called = false;
      sut.queue(() => (called = true));
      sut.dispose();

      await Promise.resolve();
      expect(called).toBe(true);
    });
  });
});
