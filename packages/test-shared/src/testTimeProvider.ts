import { describe } from "vite-plus/test";
import type { ITimeProvider, IUtcOnlyTimeProvider } from "@time-provider/core";
import { testCreatedValue } from "./helpers/testHelpers.ts";

export function testTimeProvider<TDate>(
  getTimeProvider: () => ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
) {
  describe("createTimeProvider", () => {
    testCreatedValue(getTimeProvider);
  });
}
