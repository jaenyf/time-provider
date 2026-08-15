import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import type { IAdvanceOptions } from "@time-provider/core";
import { plugin } from "../src/deterministic.ts";

/*
  This plugin is UTC-only, time `advance` is expected to be host-timezone-free.
  With a default host timezone, DST would turn a day into 23 or 25 hours and an hour into two.
*/
describe("issue#144", () => {
  describe("advance is host timezone free", () => {
    const originalTimezone = process.env.TZ;
    beforeAll(() => (process.env.TZ = "America/New_York"));
    afterAll(() => (process.env.TZ = originalTimezone));

    const elapsedAfterAdvance = (initialTime: string, options: IAdvanceOptions) => {
      const runtime = plugin.createManualRuntime(initialTime);
      const before = runtime.timestampNow();
      runtime.advance(options);
      return runtime.timestampNow() - before;
    };

    test("a day stays 24 hours across the host's spring-forward", () => {
      expect(elapsedAfterAdvance("2026-03-08T00:30:00.000Z", { days: 1 })).toBe(24 * 3600_000);
    });

    test("an hour stays one hour across the host's fall-back", () => {
      expect(elapsedAfterAdvance("2026-11-01T05:30:00.000Z", { hours: 1 })).toBe(3600_000);
    });

    test("a month keeps the same UTC time of day, clamped to the shorter month", () => {
      expect(elapsedAfterAdvance("2026-01-31T00:30:00.000Z", { months: 1 })).toBe(
        28 * 24 * 3600_000,
      );
    });
  });
});
