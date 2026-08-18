import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { BaseSystemRuntime } from "@time-provider/core";
import {
  type DurationMilliseconds,
  type EpochMilliseconds,
  type ITimeConverter,
} from "../src/types/types.ts";
import { asEpoch } from "../src/helpers/branded-types.ts";
import { TimerHandle } from "../src/runtimes/timer-handle.ts";

const noopConverter: ITimeConverter<unknown> = {
  convertToTimestamp: () => asEpoch(),
  convertToUtcDate: (time) => time,
  convertToLocalDate: (_timezone, time) => time,
};

class FakeSystemRuntime extends BaseSystemRuntime<unknown> {
  constructor() {
    super("Etc/UTC", noopConverter);
  }
  timestampNow(): EpochMilliseconds {
    return asEpoch();
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
  });

  describe("once", () => {
    test.each([undefined, -1, -100])(
      "clamps a %s delay to 0 before scheduling",
      (delay: number | undefined) => {
        const spy = vi.spyOn(globalThis, "setTimeout");
        sut.once(delay as DurationMilliseconds, () => {});
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 0);
      },
    );

    test("leaves a non-negative delay untouched", () => {
      const spy = vi.spyOn(globalThis, "setTimeout");
      sut.once(42 as DurationMilliseconds, () => {});
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 42);
    });
  });

  describe("every", () => {
    test.each([undefined, -1, 0])(
      "clamps a %s delay to 1 before scheduling",
      (delay: number | undefined) => {
        const spy = vi.spyOn(globalThis, "setInterval");
        sut.every(delay as DurationMilliseconds, () => {});
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 1);
      },
    );

    test("leaves a delay of 1 or more untouched", () => {
      const spy = vi.spyOn(globalThis, "setInterval");
      sut.every(42 as DurationMilliseconds, () => {});
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 42);
    });
  });

  describe("recurring", () => {
    test.each([undefined, -1, 0])(
      "an %s delay still recurs (~1 run per ms), same as setTimeout's own clamp for the first run",
      (delay: number | undefined) => {
        let callbackCounts = 0;
        sut.recurring(() => {
          ++callbackCounts;
          return delay as DurationMilliseconds;
        }, delay as DurationMilliseconds);
        vi.advanceTimersByTime(8);
        expect(callbackCounts).toEqual(8 + 1);
      },
    );

    test.each([2, 42, 100])("leaves a delay of 1 or more untouched", (delay) => {
      let callbackCounts = 0;
      sut.recurring(() => {
        ++callbackCounts;
        return delay as DurationMilliseconds;
      }, delay as DurationMilliseconds);
      vi.advanceTimersByTime(delay);
      expect(callbackCounts).toEqual(1);
    });

    test.each([4, 42, 100])("cancels dynamic intervals when callback returns false", (delay) => {
      let callbackCounts = 0;
      sut.recurring(() => {
        ++callbackCounts;
        return callbackCounts < 3 ? (delay as DurationMilliseconds) : false;
      }, delay as DurationMilliseconds);
      vi.advanceTimersByTime(delay * 4);
      expect(callbackCounts).toEqual(3);
    });
  });

  describe("clearing recurring", () => {
    test("cancels the schedule when called reentrantly from inside the callback itself", () => {
      let callbackCounts = 0;
      let handle: ReturnType<typeof sut.recurring>;
      handle = sut.recurring(() => {
        ++callbackCounts;
        handle.dispose();
        return 10 as DurationMilliseconds;
      }, 10 as DurationMilliseconds);
      vi.advanceTimersByTime(100);
      expect(callbackCounts).toEqual(1);
    });

    test.each([4, 42, 100])("cancels pending recurring callback", (delay) => {
      let callbackCounts = 0;
      const handle = sut.recurring(() => {
        ++callbackCounts;
        return callbackCounts < 3 ? (delay as DurationMilliseconds) : false;
      }, delay as DurationMilliseconds);
      handle.dispose();
      vi.advanceTimersByTime(1);
      expect(callbackCounts).toEqual(0);
    });
  });

  describe("clearTimer", () => {
    test.each([-1, 4, 5, 6])("throws when trying to clear unexpected kind", (wrongKind) => {
      const handleWithWrongKind = {
        kind: wrongKind,
        nativeHandle: undefined,
        isDisposed: false,
      } as TimerHandle<unknown, unknown>;
      expect(() => {
        //@ts-ignore : wrong cast
        sut.clearTimer(handleWithWrongKind as TimerHandle<unknown, unknown>);
      }).toThrow("Invalid operation");
    });
  });
});
