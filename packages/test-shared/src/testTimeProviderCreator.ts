import { describe } from "vite-plus/test";
import type { ISystemPlugin, IUtcOnlySystemPlugin } from "@time-provider/core";
import type {
  IDeterministicPlugin,
  IUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import {
  getBuilderFor,
  getDeterministicBuilderFor,
  testCreatedValue,
  testCreator,
  testDefaultEpochTime,
} from "./helpers/testHelpers.ts";

export function testTimeProviderCreator<TDate>(
  systemPlugin: ISystemPlugin<TDate> | IUtcOnlySystemPlugin<TDate>,
  deterministicPlugin: IDeterministicPlugin<TDate> | IUtcOnlyDeterministicPlugin<TDate>,
) {
  describe("system", () => {
    testCreator(systemPlugin.supportsLocalTime, () => getBuilderFor(systemPlugin));
    testCreatedValue(() => getBuilderFor(systemPlugin).create());
  });

  describe("fixed", () => {
    testCreator(deterministicPlugin.supportsLocalTime, () =>
      getDeterministicBuilderFor(deterministicPlugin).asFixed(),
    );
    testCreatedValue(() =>
      getDeterministicBuilderFor(deterministicPlugin)
        .asFixed()
        .withFixedTime("2026-01-01T00:00Z")
        .create(),
    );
    testDefaultEpochTime(() => getDeterministicBuilderFor(deterministicPlugin).asFixed().create());
  });

  describe("manual", () => {
    testCreator(deterministicPlugin.supportsLocalTime, () =>
      getDeterministicBuilderFor(deterministicPlugin).asManual(),
    );
    testCreatedValue(() =>
      getDeterministicBuilderFor(deterministicPlugin)
        .asManual()
        .withInitialTime("2026-01-01T00:00Z")
        .create(),
    );
    testDefaultEpochTime(() => getDeterministicBuilderFor(deterministicPlugin).asManual().create());
  });

  describe("sequential", () => {
    testCreator(deterministicPlugin.supportsLocalTime, () =>
      getDeterministicBuilderFor(deterministicPlugin).asSequential(),
    );
    testCreatedValue(() =>
      getDeterministicBuilderFor(deterministicPlugin)
        .asSequential()
        .withSequentialTime("2026-01-01T00:00Z")
        .create(),
    );
    testDefaultEpochTime(() =>
      getDeterministicBuilderFor(deterministicPlugin).asSequential().create(),
    );
  });
}
