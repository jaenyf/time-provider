import { describe, expect, test } from "vite-plus/test";
import { BaseManualRuntime } from "@time-provider/core/deterministic";
import type { DueHandle, ITimeConverter } from "@time-provider/core";

const identityConverter: ITimeConverter<number> = {
  convertToTimestamp: (time) => Number(time),
  convertToUtcDate: (time) => Number(time),
  convertToLocalDate: (_timezone, time) => Number(time),
};

class FakeManualRuntime extends BaseManualRuntime<number> {
  constructor(initialTime: number) {
    super("Etc/UTC", initialTime, identityConverter);
  }
  protected advanceYears(time: number, years: number): number {
    return time + years * 365 * 24 * 60 * 60 * 1000;
  }
  protected advanceMonths(time: number, months: number): number {
    return time + months * 30 * 24 * 60 * 60 * 1000;
  }
  protected advanceDays(time: number, days: number): number {
    return time + days * 24 * 60 * 60 * 1000;
  }
  protected advanceHours(time: number, hours: number): number {
    return time + hours * 60 * 60 * 1000;
  }
  protected advanceMinutes(time: number, minutes: number): number {
    return time + minutes * 60 * 1000;
  }
  protected advanceSeconds(time: number, seconds: number): number {
    return time + seconds * 1000;
  }
  protected advanceMilliseconds(time: number, milliseconds: number): number {
    return time + milliseconds;
  }
}

describe("BaseManualRuntime scheduling (heap internals)", () => {
  /** A cheap deterministic pseudo-random PRNG (mulberry32) generator to mimic delays induced by real scheduler calls */
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  test.each([1, 2, 3, 4, 5])(
    "cancelling scattered timers (seed %i) still fires the rest in chronological order",
    (seed) => {
      const random = mulberry32(seed);
      const count = 40;
      const delays = Array.from({ length: count }, () => 1 + Math.floor(random() * 10000));
      // Distinct delays keep the expected firing order unambiguous (no same-runAt tie-breaking).
      const uniqueDelays = [...new Set(delays)];

      const sut = new FakeManualRuntime(0);
      const fired: number[] = [];
      const handles: DueHandle[] = uniqueDelays.map((delay) =>
        sut.scheduler.setTimeout(() => fired.push(delay), delay),
      );

      // Cancel roughly a third of them, scattered across the whole insertion order (and so
      // across the whole heap array, not clustered near the end).
      const cancelledIndices = handles
        .map((_, i) => i)
        .filter((_i) => Math.floor(random() * 3) === 0);
      for (const i of cancelledIndices) {
        sut.scheduler.clearTimeout(handles[i]);
      }

      sut.advance({ milliseconds: 20000 });

      const cancelled = new Set(cancelledIndices.map((i) => uniqueDelays[i]));
      const expected = uniqueDelays
        .filter((delay) => !cancelled.has(delay))
        .toSorted((a, b) => a - b);
      expect(fired).toEqual(expected);
    },
  );
});

describe("BaseDeterministicRuntime clearDueHandle", () => {
  test("clearInterval does not cancel a timeout scheduled with the same runtime", () => {
    const sut = new FakeManualRuntime(0);
    let timeoutFired = false;
    const timeoutHandle = sut.scheduler.setTimeout(() => (timeoutFired = true), 10);

    sut.scheduler.clearInterval(timeoutHandle);
    sut.advance({ milliseconds: 10 });

    expect(timeoutFired).toBe(true);
  });

  test("clearTimeout does not cancel an interval scheduled with the same runtime", () => {
    const sut = new FakeManualRuntime(0);
    let intervalFireCount = 0;
    const intervalHandle = sut.scheduler.setInterval(() => intervalFireCount++, 10);

    sut.scheduler.clearTimeout(intervalHandle);
    sut.advance({ milliseconds: 10 });

    expect(intervalFireCount).toBe(1);
  });
});
