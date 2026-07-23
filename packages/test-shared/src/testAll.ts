import { describe } from "vite-plus/test";
import { testSystemRuntime } from "./testSystemRuntime.ts";
import { testFixedRuntime } from "./testFixedRuntime.ts";
import { testManualRuntime } from "./testManualRuntime.ts";
import { testSequentialRuntime } from "./testSequentialRuntime.ts";
import { testTimeProvider } from "./testTimeProvider.ts";
import { testTimeProviderCreator } from "./testTimeProviderCreator.ts";
import { getBuilderFor, getDeterministicBuilderFor } from "./helpers/testHelpers.ts";
import type { ISystemPlugin, IUtcOnlySystemPlugin } from "@time-provider/core";
import type {
  IDeterministicPlugin,
  IUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";

export function testAll<TDate>(
  systemPlugin: ISystemPlugin<TDate> | IUtcOnlySystemPlugin<TDate>,
  deterministicPlugin: IDeterministicPlugin<TDate> | IUtcOnlyDeterministicPlugin<TDate>,
) {
  const throwInvalidOperation = function () {
    throw new Error("Invalid operation");
  };

  const parseTimeToUtc = (initialValue: number | string | TDate) =>
    systemPlugin.supportsLocalTime
      ? systemPlugin.createSystemRuntime("Pacific/Kiritimati").parseToUtc(initialValue)
      : systemPlugin.createSystemRuntime().parseToUtc(initialValue);
  const parseTimeToLocal = (initialValue: number | string | TDate) =>
    systemPlugin.supportsLocalTime
      ? systemPlugin.createSystemRuntime("Pacific/Kiritimati").parseToLocal(initialValue)
      : throwInvalidOperation();

  describe("Runtimes", () => {
    testSystemRuntime(systemPlugin, parseTimeToUtc, parseTimeToLocal);
    testFixedRuntime(deterministicPlugin, parseTimeToUtc, parseTimeToLocal);
    testManualRuntime(deterministicPlugin, parseTimeToUtc, parseTimeToLocal);
    testSequentialRuntime(deterministicPlugin, parseTimeToUtc, parseTimeToLocal);
  });

  describe("TimeProviderCreators", () => {
    testTimeProviderCreator(systemPlugin, deterministicPlugin);
  });

  describe("TimeProviders", () => {
    describe("system", () => {
      testTimeProvider(() => getBuilderFor(systemPlugin).create());
    });

    describe("fixed", () => {
      testTimeProvider(() =>
        getDeterministicBuilderFor(deterministicPlugin)
          .asFixed()
          .withFixedTime("2026-01-01T00:00:00.000Z")
          .create(),
      );
    });

    describe("manual", () => {
      testTimeProvider(() =>
        getDeterministicBuilderFor(deterministicPlugin)
          .asManual()
          .withInitialTime("2026-01-01T00:00:00.000Z")
          .create(),
      );
    });

    describe("sequential", () => {
      testTimeProvider(() =>
        getDeterministicBuilderFor(deterministicPlugin)
          .asSequential()
          .withSequentialTime("2026-01-01T00:00:00.000Z")
          .create(),
      );
    });
  });
}
