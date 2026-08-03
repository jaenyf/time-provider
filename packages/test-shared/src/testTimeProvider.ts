import { describe, expect, test } from "vite-plus/test";
import type { ITimeProvider, IUtcOnlyTimeProvider } from "@time-provider/core";
import { testCreatedValue } from "./helpers/testHelpers.ts";

export function testTimeProvider<TDate>(
  getTimeProvider: () => ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
  getExpectedUtcNow?: () => TDate,
) {
  describe("createTimeProvider", () => {
    testCreatedValue(getTimeProvider);

    if (getExpectedUtcNow) {
      test("reflects the builder's given initial time, not a default", () => {
        expect(getTimeProvider().clock.utcNow()).toEqual(getExpectedUtcNow());
      });
    }
  });
}
