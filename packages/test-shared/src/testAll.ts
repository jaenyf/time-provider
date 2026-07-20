import { describe } from "vite-plus/test";
import { testSystemRuntime } from "./testSystemRuntime.ts";
import { testFixedRuntime } from "./testFixedRuntime.ts";
import { testManualRuntime } from "./testManualRuntime.ts";
import { testSequentialRuntime } from "./testSequentialRuntime.ts";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";
import { getBuilderFor } from "./helpers/testHelpers.ts";
import type { IPlugin, IUtcOnlyPlugin } from "@time-provider/core";

export function testAll<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  const throwInvalidOperation = function () {
    throw new Error("Invalid operation");
  };

  const parseTimeToUtc = (initialValue: number | string | TDate) =>
    plugin.supportsLocalTime
      ? plugin.createSystemRuntime("Pacific/Kiritimati").parseToUtc(initialValue)
      : plugin.createSystemRuntime().parseToUtc(initialValue);
  const parseTimeToLocal = (initialValue: number | string | TDate) =>
    plugin.supportsLocalTime
      ? plugin.createSystemRuntime("Pacific/Kiritimati").parseToLocal(initialValue)
      : throwInvalidOperation();

  describe("Runtimes", () => {
    testSystemRuntime(plugin, parseTimeToUtc, parseTimeToLocal);
    testFixedRuntime(plugin, parseTimeToUtc, parseTimeToLocal);
    testManualRuntime(plugin, parseTimeToUtc, parseTimeToLocal);
    testSequentialRuntime(plugin, parseTimeToUtc, parseTimeToLocal);
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
