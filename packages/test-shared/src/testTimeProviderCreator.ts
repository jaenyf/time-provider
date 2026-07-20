import { describe } from "vite-plus/test";
import type { IPlugin, IUtcOnlyPlugin } from "@time-provider/core";
import { getBuilderFor, testCreatedValue, testDefaultEpochTime } from "./helpers/testHelpers.ts";

export function testTimeProviderCreator<TDate>(plugin: IPlugin<TDate> | IUtcOnlyPlugin<TDate>) {
  describe("system", () => {
    testCreatedValue(() => getBuilderFor(plugin).create());
  });

  describe("fixed", () => {
    testCreatedValue(() =>
      getBuilderFor(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create(),
    );
    testDefaultEpochTime(() => getBuilderFor(plugin).asFixed().create());
  });

  describe("manual", () => {
    testCreatedValue(() =>
      getBuilderFor(plugin).asManual().withInitialTime("2026-01-01T00:00Z").create(),
    );
    testDefaultEpochTime(() => getBuilderFor(plugin).asManual().create());
  });

  describe("sequential", () => {
    testCreatedValue(() =>
      getBuilderFor(plugin).asSequential().withSequentialTime("2026-01-01T00:00Z").create(),
    );
    testDefaultEpochTime(() => getBuilderFor(plugin).asSequential().create());
  });
}
