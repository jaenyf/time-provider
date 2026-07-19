import { describe } from "vite-plus/test";
import { testSystemRuntime } from "./testSystemRuntime.ts";
import { testFixedRuntime } from "./testFixedRuntime.ts";
import { testManualRuntime } from "./testManualRuntime.ts";
import { testSequentialRuntime } from "./testSequentialRuntime.ts";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";
import { createTimeProvider, type IPlugin, type IUtcOnlyPlugin } from "@time-provider/core";

function forPlugin<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  return plugin.supportsLocalTime ? createTimeProvider.for(plugin) : createTimeProvider.for(plugin);
}

export function testAll<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  const parseTime = (initialValue: number | string | TDate) =>
    plugin.createSystemRuntime().parse(initialValue);
  const supportsLocalTime = plugin.supportsLocalTime;

  describe("Runtimes", () => {
    testSystemRuntime(
      plugin,
      (time: number | string | TDate) => parseTime(time),
      supportsLocalTime,
    );
    testFixedRuntime(plugin, (time: number | string | TDate) => parseTime(time), supportsLocalTime);
    testManualRuntime(
      plugin,
      (time: number | string | TDate) => parseTime(time),
      supportsLocalTime,
    );
    testSequentialRuntime(
      plugin,
      (time: number | string | TDate) => parseTime(time),
      supportsLocalTime,
    );
  });

  describe("TimeProviderCreators", () => {
    testTimeProviderCreator(plugin);
  });

  describe("TimeProviders", () => {
    describe("system", () => {
      testTimeProvider(() => forPlugin(plugin).create());
    });

    describe("fixed", () => {
      testTimeProvider(() =>
        forPlugin(plugin).asFixed().withFixedTime("2026-01-01T00:00:00.000Z").create(),
      );
    });

    describe("manual", () => {
      testTimeProvider(() =>
        forPlugin(plugin).asManual().withInitialTime("2026-01-01T00:00:00.000Z").create(),
      );
    });

    describe("sequential", () => {
      testTimeProvider(() =>
        forPlugin(plugin).asSequential().withSequentialTime("2026-01-01T00:00:00.000Z").create(),
      );
    });
  });
}
