import { describe } from "vite-plus/test";
import { testSystemRuntime } from "./testSystemRuntime.ts";
import { testFixedRuntime } from "./testFixedRuntime.ts";
import { testManualRuntime } from "./testManualRuntime.ts";
import { testSequentialRuntime } from "./testSequentialRuntime.ts";
import { createTimeProvider, type IPlugin } from "@time-provider/core";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";

export function testAll<TDate>(plugin: IPlugin<TDate>) {
  const parseTime = (initialValue: number | string | TDate) =>
    plugin.createSystemRuntime().parse(initialValue);

  describe("Runtimes", () => {
    testSystemRuntime(plugin, (time: number | string | TDate) => parseTime(time));
    testFixedRuntime(plugin, (time: number | string | TDate) => parseTime(time));
    testManualRuntime(plugin, (time: number | string | TDate) => parseTime(time));
    testSequentialRuntime(plugin, (time: number | string | TDate) => parseTime(time));
  });

  describe("TimeProviderCreators", () => {
    testTimeProviderCreator(plugin);
  });

  describe("TimeProviders", () => {
    describe("system", () => {
      testTimeProvider(() => createTimeProvider.for(plugin).create());
    });

    describe("fixed", () => {
      testTimeProvider(() =>
        createTimeProvider.for(plugin).asFixed().withFixedTime("2026-01-01T00:00:00.000Z").create(),
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
}
