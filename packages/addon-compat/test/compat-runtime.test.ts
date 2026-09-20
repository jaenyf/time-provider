import { describe, expect, test } from "vite-plus/test";
import {
  toDuration,
  toInstant,
  type EpochMilliseconds,
  type IDurationSpec,
  type IPerformance,
  type IPerformanceEntry,
  type IRuntime,
  type IScheduledHandle,
  type ITimers,
} from "@time-provider/core";
import { CompatRuntime } from "../src/compat-runtime.ts";
import type { ICompatApi } from "../src/types.ts";

type ScheduledCall = {
  method: "once" | "every" | "recurring";
  durationSpec: IDurationSpec;
  callback: () => unknown;
  handle: IScheduledHandle;
};

type FakeRuntime = IRuntime<unknown> & {
  compat?: ICompatApi<unknown>;
  scheduler: { timers: ITimers };
  performance: IPerformance;
  calls: ScheduledCall[];
  performanceCalls: { method: string; args: unknown[] }[];
  timeOrigin: EpochMilliseconds;
};

function fakeRuntime(): FakeRuntime {
  const calls: ScheduledCall[] = [];
  const performanceCalls: { method: string; args: unknown[] }[] = [];
  const record =
    (method: ScheduledCall["method"]) => (durationSpec: IDurationSpec, callback: () => unknown) => {
      let disposed = false;
      const handle = {
        dispose: () => {
          disposed = true;
        },
        get isDisposed() {
          return disposed;
        },
      } as unknown as IScheduledHandle;
      calls.push({ method, durationSpec, callback, handle });
      return handle;
    };
  const track =
    <TResult>(method: string, result: TResult) =>
    (...args: unknown[]): TResult => {
      performanceCalls.push({ method, args });
      return result;
    };
  const runtime = {
    calls,
    performanceCalls,
    timeOrigin: toInstant({ milliseconds: 1000 }),
    registerAddon: () => {},
    scheduler: {
      timers: {
        once: record("once"),
        every: record("every"),
        // `recurring` takes its callback first - see ITimers in core.
        recurring: (callback: () => unknown, durationSpec: IDurationSpec) =>
          record("recurring")(durationSpec, callback),
        wait() {
          throw new Error("not used by the compat addon");
        },
      },
    },
    performance: {
      now: track("now", toDuration({ milliseconds: 42 })),
      get timeOrigin() {
        return runtime.timeOrigin;
      },
      getEntries: track<readonly IPerformanceEntry[]>("getEntries", []),
      getEntriesByName: track<readonly IPerformanceEntry[]>("getEntriesByName", []),
      getEntriesByType: track<readonly IPerformanceEntry[]>("getEntriesByType", []),
      mark: track("mark", { name: "mark" } as never),
      measure: track("measure", { name: "measure" } as never),
      clearMarks: track("clearMarks", undefined),
      clearMeasures: track("clearMeasures", undefined),
    },
  } as unknown as FakeRuntime;
  return runtime;
}

function composed(): { runtime: FakeRuntime; compat: ICompatApi<unknown> } {
  const runtime = fakeRuntime();
  const sut = new CompatRuntime<unknown>();
  sut.applyToRuntime(runtime);
  return { runtime, compat: runtime.compat! };
}

describe("CompatRuntime", () => {
  describe("addon facade", () => {
    test("applyToRuntime exposes a dedicated facade property on the runtime", () => {
      const { compat } = composed();
      expect(compat).toBeDefined();
    });

    test("every member sits flat on the facade, with no timers or performance level", () => {
      const { compat } = composed();
      expect(Object.keys(compat).toSorted()).toEqual(
        [
          "clearInterval",
          "clearMarks",
          "clearMeasures",
          "clearRecurring",
          "clearTimeout",
          "getEntries",
          "getEntriesByName",
          "getEntriesByType",
          "mark",
          "measure",
          "now",
          "setInterval",
          "setRecurring",
          "setTimeout",
          "timeOrigin",
        ].toSorted(),
      );
    });
  });

  describe("timers", () => {
    test("setTimeout schedules a single run through the runtime's timers", () => {
      const { runtime, compat } = composed();
      const callback = () => {};
      compat.setTimeout(callback, 500);
      expect(runtime.calls[0]).toMatchObject({
        method: "once",
        durationSpec: { milliseconds: 500 },
        callback,
      });
    });

    test("setInterval schedules a repeating run through the runtime's timers", () => {
      const { runtime, compat } = composed();
      compat.setInterval(() => {}, 250);
      expect(runtime.calls[0]).toMatchObject({
        method: "every",
        durationSpec: { milliseconds: 250 },
      });
    });

    test("an omitted delay is scheduled as 0", () => {
      const { runtime, compat } = composed();
      compat.setTimeout(() => {});
      compat.setInterval(() => {});
      compat.setRecurring(() => false);
      expect(runtime.calls.map((call) => call.durationSpec)).toEqual([
        { milliseconds: 0 },
        { milliseconds: 0 },
        { milliseconds: 0 },
      ]);
    });

    test("setRecurring turns the delay its callback returns into a duration", () => {
      const { runtime, compat } = composed();
      compat.setRecurring(() => 30, 10);
      expect(runtime.calls[0]).toMatchObject({
        method: "recurring",
        durationSpec: { milliseconds: 10 },
      });
      expect(runtime.calls[0]!.callback()).toEqual({ milliseconds: 30 });
    });

    test("setRecurring stops when its callback returns false", () => {
      const { runtime, compat } = composed();
      compat.setRecurring(() => false);
      expect(runtime.calls[0]!.callback()).toBe(false);
    });

    test.each([
      ["clearTimeout", (compat: ICompatApi<unknown>) => compat.setTimeout(() => {})],
      ["clearInterval", (compat: ICompatApi<unknown>) => compat.setInterval(() => {})],
      ["clearRecurring", (compat: ICompatApi<unknown>) => compat.setRecurring(() => false)],
    ] as const)("%s disposes the handle it is given", (clearMethod, schedule) => {
      const { compat } = composed();
      const handle = schedule(compat);
      compat[clearMethod](handle);
      expect(handle.isDisposed).toBe(true);
    });
  });

  describe("performance", () => {
    test.each([
      ["now", (compat: ICompatApi<unknown>) => compat.now(), []],
      ["getEntries", (compat: ICompatApi<unknown>) => compat.getEntries(), []],
      [
        "getEntriesByName",
        (compat: ICompatApi<unknown>) => compat.getEntriesByName("a", "mark"),
        ["a", "mark"],
      ],
      [
        "getEntriesByType",
        (compat: ICompatApi<unknown>) => compat.getEntriesByType("measure"),
        ["measure"],
      ],
      ["mark", (compat: ICompatApi<unknown>) => compat.mark("a"), ["a", undefined]],
      ["measure", (compat: ICompatApi<unknown>) => compat.measure("a", "b"), ["a", "b"]],
      ["clearMarks", (compat: ICompatApi<unknown>) => compat.clearMarks("a"), ["a"]],
      ["clearMeasures", (compat: ICompatApi<unknown>) => compat.clearMeasures("a"), ["a"]],
    ] as const)("%s delegates to the runtime's performance API", (method, call, args) => {
      const { runtime, compat } = composed();
      call(compat);
      expect(runtime.performanceCalls).toEqual([{ method, args }]);
    });

    test("timeOrigin is read from the runtime on every access, not captured once", () => {
      const { runtime, compat } = composed();
      expect(compat.timeOrigin).toBe(1000);
      runtime.timeOrigin = toInstant({ milliseconds: 2000 });
      expect(compat.timeOrigin).toBe(2000);
    });
  });

  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      const sut = new CompatRuntime<unknown>();
      sut.applyToRuntime(fakeRuntime());
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });

    test("implicit dispose call disposes instance", () => {
      let sutRef: CompatRuntime<unknown> | undefined = undefined;
      {
        using sut = new CompatRuntime<unknown>();
        sut.applyToRuntime(fakeRuntime());
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });
});
