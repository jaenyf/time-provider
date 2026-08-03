import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { BaseSystemRuntime } from "@time-provider/core";
import type { ITimeConverter } from "@time-provider/core";

const noopConverter: ITimeConverter<unknown> = {
  convertToTimestamp: () => 0,
  convertToUtcDate: (time) => time,
  convertToLocalDate: (_timezone, time) => time,
};

class FakeSystemRuntime extends BaseSystemRuntime<unknown> {
  constructor() {
    super("Etc/UTC", noopConverter);
  }
  timestampNow(): number {
    return 0;
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

  describe("setTimeout", () => {
    test.each([undefined, -1, -100])(
      "clamps a %s delay to 0 before scheduling",
      (delay: number | undefined) => {
        const spy = vi.spyOn(globalThis, "setTimeout");
        sut.setTimeout(() => {}, delay);
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 0);
      },
    );

    test("leaves a non-negative delay untouched", () => {
      const spy = vi.spyOn(globalThis, "setTimeout");
      sut.setTimeout(() => {}, 42);
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 42);
    });
  });

  describe("setInterval", () => {
    test.each([undefined, -1, 0])(
      "clamps a %s delay to 1 before scheduling",
      (delay: number | undefined) => {
        const spy = vi.spyOn(globalThis, "setInterval");
        sut.setInterval(() => {}, delay);
        expect(spy).toHaveBeenCalledWith(expect.any(Function), 1);
      },
    );

    test("leaves a delay of 1 or more untouched", () => {
      const spy = vi.spyOn(globalThis, "setInterval");
      sut.setInterval(() => {}, 42);
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 42);
    });
  });

  describe("setRecurring", () => {
    test.each([undefined, -1, 0])(
      "an %s delay still recurs (~1 run per ms), same as setTimeout's own clamp for the first run",
      (delay: number | undefined) => {
        let callbackCounts = 0;
        sut.setRecurring(() => {
          ++callbackCounts;
          return delay as number;
        }, delay);
        vi.advanceTimersByTime(8);
        expect(callbackCounts).toEqual(8 + 1);
      },
    );

    test.each([2, 42, 100])("leaves a delay of 1 or more untouched", (delay) => {
      let callbackCounts = 0;
      sut.setRecurring(() => {
        ++callbackCounts;
        return delay;
      }, delay);
      vi.advanceTimersByTime(delay);
      expect(callbackCounts).toEqual(1);
    });

    test.each([4, 42, 100])("cancels dynamic intervals when callback returns false", (delay) => {
      let callbackCounts = 0;
      sut.setRecurring(() => {
        ++callbackCounts;
        return callbackCounts < 3 ? delay : false;
      }, delay);
      vi.advanceTimersByTime(delay * 4);
      expect(callbackCounts).toEqual(3);
    });
  });

  describe("clearRecurring", () => {
    test("cancels the schedule when called reentrantly from inside the callback itself", () => {
      let callbackCounts = 0;
      let handle: ReturnType<typeof sut.setRecurring>;
      handle = sut.setRecurring(() => {
        ++callbackCounts;
        sut.clearRecurring(handle);
        return 10;
      }, 10);
      vi.advanceTimersByTime(100);
      expect(callbackCounts).toEqual(1);
    });

    test.each([4, 42, 100])("cancels pending recurring callback", (delay) => {
      let callbackCounts = 0;
      const handle = sut.setRecurring(() => {
        ++callbackCounts;
        return callbackCounts < 3 ? delay : false;
      }, delay);
      sut.clearRecurring(handle);
      vi.advanceTimersByTime(1);
      expect(callbackCounts).toEqual(0);
    });
  });
});
