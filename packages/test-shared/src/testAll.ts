import { describe } from "vite-plus/test";
import { testSystemRuntime } from "./testSystemRuntime.ts";
import { testFixedRuntime } from "./testFixedRuntime.ts";
import { testManualRuntime } from "./testManualRuntime.ts";
import { testSequentialRuntime } from "./testSequentialRuntime.ts";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";
import { createTimeProvider, type IPlugin, type IUtcOnlyPlugin } from "@time-provider/core";

export function testAll<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  function getBuilderFor<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
    return plugin.supportsLocalTime
      ? createTimeProvider.for(plugin)
      : createTimeProvider.for(plugin);
  }

  const parseTime = (initialValue: number | string | TDate, expressesAsLocal: boolean = false) =>
    plugin.supportsLocalTime
      ? plugin.createSystemRuntime("Pacific/Kiritimati").parse(initialValue, expressesAsLocal)
      : plugin.createSystemRuntime().parse(initialValue, expressesAsLocal);

  describe("Runtimes", () => {
    testSystemRuntime(plugin, (time: number | string | TDate) => parseTime(time));
    testFixedRuntime(plugin, parseTime);
    testManualRuntime(plugin, parseTime);
    testSequentialRuntime(plugin, parseTime);
  });

  describe("TimeProviderCreators", () => {
    testTimeProviderCreator(plugin);
  });

  describe("TimeProviders", () => {
    describe("system", () => {
      testTimeProvider(() => getBuilderFor(plugin).create());
    });

    describe("fixed", () => {
      testTimeProvider(() =>
        getBuilderFor(plugin).asFixed().withFixedTime("2026-01-01T00:00:00.000Z").create(),
      );
    });

    describe("manual", () => {
      testTimeProvider(() =>
        getBuilderFor(plugin).asManual().withInitialTime("2026-01-01T00:00:00.000Z").create(),
      );
    });

    describe("sequential", () => {
      testTimeProvider(() =>
        getBuilderFor(plugin)
          .asSequential()
          .withSequentialTime("2026-01-01T00:00:00.000Z")
          .create(),
      );
    });
  });
}
