import { describe } from "vite-plus/test";
import { testTimeAdapter } from "./testTimeAdapter.ts";
import { testFixedTimeAdapter } from "./testFixedTimeAdapter.ts";
import { testManualTimeAdapter } from "./testManualTimeAdapter.ts";
import { testSequentialTimeAdapter } from "./testSequentialTimeAdapter.ts";
import { createTimeProvider, type IPlugin } from "@time-provider/core";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";

export function testAll<TDate>(pluginName: string, plugin: IPlugin<TDate>) {
  const createFixedDate = (initialValue: number | string | TDate) =>
    plugin.createTimeAdapter().parse(initialValue);

  describe("TimeAdapters", () => {
    describe(pluginName, () => {
      testTimeAdapter(plugin, (fixedDate: number | string | TDate) => createFixedDate(fixedDate));

      testFixedTimeAdapter(plugin, (fixedDate: number | string | TDate) =>
        createFixedDate(fixedDate),
      );

      testManualTimeAdapter(pluginName, plugin, (fixedDate: number | string | TDate) =>
        createFixedDate(fixedDate),
      );

      testSequentialTimeAdapter(pluginName, plugin, (fixedDate: number | string | TDate) =>
        createFixedDate(fixedDate),
      );
    });
  });

  describe("TimeProviderCreators", () => {
    describe(pluginName, () => {
      testTimeProviderCreator(plugin);
    });
  });

  describe("TimeProviders", () => {
    describe(pluginName, () => {
      testTimeProvider(() => createTimeProvider.for(plugin).create());
      testTimeProvider(() =>
        createTimeProvider.for(plugin).asFixed().withFixedTime("2026-01-01T00:00:00.000Z").create(),
      );
      testTimeProvider(() =>
        createTimeProvider
          .for(plugin)
          .asManual()
          .withInitialTime("2026-01-01T00:00:00.000Z")
          .create(),
      );
      testTimeProvider(() =>
        createTimeProvider
          .for(plugin)
          .asSequential()
          .withSequentialTime("2026-01-01T00:00:00.000Z")
          .create(),
      );
    });
  });
}
