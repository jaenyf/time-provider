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
});
