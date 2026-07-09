import { describe } from "vite-plus/test";
import { testSystemTimeAdapter } from "./testSystemTimeAdapter.ts";
import { testFixedTimeAdapter } from "./testFixedTimeAdapter.ts";
import { testManualTimeAdapter } from "./testManualTimeAdapter.ts";
import { testSequentialTimeAdapter } from "./testSequentialTimeAdapter.ts";
import { createTimeProvider, type IPlugin, type IScheduler } from "@time-provider/core";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";

export function testAll<TDate>(pluginName: string, plugin: IPlugin<TDate>, scheduler: IScheduler) {
  const parseTime = (initialValue: number | string | TDate) =>
    plugin.createTimeAdapter(scheduler).parse(initialValue);

  describe("TimeAdapters", () => {
    describe(pluginName, () => {
      testSystemTimeAdapter(plugin, scheduler, (time: number | string | TDate) => parseTime(time));
      testFixedTimeAdapter(plugin, scheduler, (time: number | string | TDate) => parseTime(time));
      testManualTimeAdapter(plugin, scheduler, (time: number | string | TDate) => parseTime(time));
      testSequentialTimeAdapter(plugin, scheduler, (time: number | string | TDate) =>
        parseTime(time),
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
      describe("system", () => {
        testTimeProvider(() => createTimeProvider.for(plugin).create());
      });

      describe("fixed", () => {
        testTimeProvider(() =>
          createTimeProvider
            .for(plugin)
            .asFixed()
            .withFixedTime("2026-01-01T00:00:00.000Z")
            .create(),
        );
      });

      describe("manual", () => {
        testTimeProvider(() =>
          createTimeProvider
            .for(plugin)
            .asManual()
            .withInitialTime("2026-01-01T00:00:00.000Z")
            .create(),
        );
      });

      describe("sequential", () => {
        testTimeProvider(() =>
          createTimeProvider
            .for(plugin)
            .asSequential()
            .withSequentialTime("2026-01-01T00:00:00.000Z")
            .create(),
        );
      });
    });
  });
}
