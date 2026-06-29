import { describe } from "vite-plus/test";
import { testTimeAdapter } from "./testTimeAdapter.ts";
import { testFixedTimeAdapter } from "./testFixedTimeAdapter.ts";
import { createTimeProvider, type ITimeAdapter } from "@time-provider/core";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testFixedTimeProvider } from "./testFixedTimeProvider.ts";

export function testAll<TDate>(
  pluginName: string,
  createFixedDate: (fixedDate: number | string | TDate) => TDate,
  createTimeAdapter: () => ITimeAdapter<TDate>,
  createFixedTimeAdapter: () => ITimeAdapter<TDate>,
) {
  describe("TimeAdapters", () => {
    describe(pluginName, () => {
      testTimeAdapter(
        () => createTimeAdapter(),
        (fixedDate: number | string | TDate) => createFixedDate(fixedDate),
      );

      testFixedTimeAdapter(
        () => createFixedTimeAdapter(),
        (fixedDate: number | string | TDate) => createFixedDate(fixedDate),
      );
    });
  });

  describe("TimeProviders", () => {
    describe(pluginName, () => {
      testTimeProvider(() => createTimeProvider.for(createTimeAdapter()));

      testFixedTimeProvider(() => createTimeProvider.for(createFixedTimeAdapter()));
    });
  });
}
