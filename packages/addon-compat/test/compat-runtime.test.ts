import { describe, expect, test } from "vite-plus/test";
import {
  toInstant,
  toMonotonic,
  type EpochMilliseconds,
  type IDurationSpec,
  type IMicrotasks,
  type IRuntime,
  type IScheduledHandle,
  type ITimingEntry,
  type ITimers,
} from "@time-provider/core";
import { CompatRuntime } from "../src/compat-runtime.ts";
import type { ICompatApi } from "../src/types.ts";

type ScheduledCall = {
  method: "once" | "every";
  durationSpec: IDurationSpec;
  callback: () => unknown;
  handle: IScheduledHandle;
};

type FakeRuntime = IRuntime<unknown> & {
  compat?: ICompatApi<unknown>;
  scheduler: { timers: ITimers; microtasks: IMicrotasks };
  microtasks: (() => void)[];
  calls: ScheduledCall[];
  performanceCalls: { method: string; args: unknown[] }[];
  monotonicOrigin: EpochMilliseconds;
  entries: ITimingEntry[];
};

function fakeRuntime(): FakeRuntime {
  const calls: ScheduledCall[] = [];
  const microtasks: (() => void)[] = [];
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
    microtasks,
    performanceCalls,
    monotonicOrigin: toInstant({ milliseconds: 1000 }),
    entries: [],
    registerAddon: () => {},
    scheduler: {
      timers: {
        once: record("once"),
        every: record("every"),
        recurring() {
          throw new Error("not used by the compat addon");
        },
        wait() {
          throw new Error("not used by the compat addon");
        },
      },
      microtasks: {
        queue: (callback: () => void) => microtasks.push(callback),
      },
    },
    clock: {
      monotonicNow: track("monotonicNow", toMonotonic({ milliseconds: 42 })),
      get monotonicOrigin() {
        return runtime.monotonicOrigin;
      },
    },
    timings: {
      entries: () => runtime.entries,
      mark: track("mark", { name: "mark" } as never),
      measure: track("measure", { name: "measure" } as never),
      clear: track("clear", undefined),
    },
  } as unknown as FakeRuntime;
  return runtime;
}

function composed(readsHostTimeline = false): {
  runtime: FakeRuntime;
  compat: ICompatApi<unknown>;
} {
  const runtime = fakeRuntime();
  const sut = new CompatRuntime<unknown>(readsHostTimeline);
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
          "clearTimeout",
          "getEntries",
          "getEntriesByName",
          "getEntriesByType",
          "mark",
          "measure",
          "now",
          "queueMicrotask",
          "setInterval",
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
      expect(runtime.calls.map((call) => call.durationSpec)).toEqual([
        { milliseconds: 0 },
        { milliseconds: 0 },
      ]);
    });

    test.each([
      ["clearTimeout", (compat: ICompatApi<unknown>) => compat.setTimeout(() => {})],
      ["clearInterval", (compat: ICompatApi<unknown>) => compat.setInterval(() => {})],
    ] as const)("%s disposes the handle it is given", (clearMethod, schedule) => {
      const { compat } = composed();
      const handle = schedule(compat);
      compat[clearMethod](handle);
      expect(handle.isDisposed).toBe(true);
    });
  });

  describe("microtasks", () => {
    test("queueMicrotask queues through the runtime's microtasks", () => {
      const { runtime, compat } = composed();
      const callback = () => {};
      compat.queueMicrotask(callback);
      expect(runtime.microtasks).toEqual([callback]);
    });
  });

  describe("performance", () => {
    test.each([
      ["monotonicNow", (compat: ICompatApi<unknown>) => compat.now(), []],
      ["mark", (compat: ICompatApi<unknown>) => compat.mark("a"), ["a", undefined]],
      ["measure", (compat: ICompatApi<unknown>) => compat.measure("a"), ["a", undefined]],
      ["measure", (compat: ICompatApi<unknown>) => compat.measure("a", "b"), ["a", { start: "b" }]],
      [
        "measure",
        (compat: ICompatApi<unknown>) => compat.measure("a", { end: "b" }),
        ["a", { end: "b" }],
      ],
      [
        "clear",
        (compat: ICompatApi<unknown>) => compat.clearMarks("a"),
        [{ kind: "mark", name: "a" }],
      ],
      [
        "clear",
        (compat: ICompatApi<unknown>) => compat.clearMeasures(),
        [{ kind: "measure", name: undefined }],
      ],
    ] as const)("%s is called on the runtime (%#)", (method, call, args) => {
      const { runtime, compat } = composed();
      call(compat);
      expect(runtime.performanceCalls).toEqual([{ method, args }]);
    });

    test("timeOrigin is read from the runtime on every access, not captured once", () => {
      const { runtime, compat } = composed();
      expect(compat.timeOrigin).toBe(1000);
      runtime.monotonicOrigin = toInstant({ milliseconds: 2000 });
      expect(compat.timeOrigin).toBe(2000);
    });

    describe("on the runtime's timings", () => {
      const entry = (name: string, entryType: "mark" | "measure") =>
        ({ name, entryType }) as ITimingEntry;
      const withEntries = () => {
        const { runtime, compat } = composed();
        runtime.entries = [entry("a", "mark"), entry("a", "measure"), entry("b", "mark")];
        return compat;
      };

      test("getEntries lists the runtime's entries", () => {
        expect(withEntries().getEntries()).toHaveLength(3);
      });

      test("getEntriesByName filters by name, then by type", () => {
        const compat = withEntries();
        expect(compat.getEntriesByName("a")).toHaveLength(2);
        expect(compat.getEntriesByName("a", "measure")).toEqual([entry("a", "measure")]);
      });

      test("getEntriesByType filters by type", () => {
        expect(withEntries().getEntriesByType("mark")).toEqual([
          entry("a", "mark"),
          entry("b", "mark"),
        ]);
      });
    });

    describe("on the host timeline", () => {
      test("the getEntries readers list what the host recorded", () => {
        const { compat } = composed(true);
        performance.mark("compat-host-mark");
        try {
          expect(compat.getEntries()).toContainEqual(
            expect.objectContaining({ name: "compat-host-mark" }),
          );
          expect(compat.getEntriesByName("compat-host-mark", "mark")).toHaveLength(1);
          expect(compat.getEntriesByType("mark")).toContainEqual(
            expect.objectContaining({ name: "compat-host-mark" }),
          );
        } finally {
          performance.clearMarks("compat-host-mark");
        }
      });
    });
  });

  describe("dispose", () => {
    test("explicit dispose call disposes instance", () => {
      const sut = new CompatRuntime<unknown>(false);
      sut.applyToRuntime(fakeRuntime());
      sut.dispose();
      expect(sut.isDisposed).toBe(true);
    });

    test("implicit dispose call disposes instance", () => {
      let sutRef: CompatRuntime<unknown> | undefined = undefined;
      {
        using sut = new CompatRuntime<unknown>(false);
        sut.applyToRuntime(fakeRuntime());
        sutRef = sut;
      }
      expect(sutRef.isDisposed).toBe(true);
    });
  });
});
