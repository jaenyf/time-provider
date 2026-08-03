import { describe, expect, test } from "vite-plus/test";
import {
  BaseDeterministicPlugin,
  BaseUtcOnlyDeterministicPlugin,
} from "@time-provider/core/deterministic";
import type { IRuntime, IUtcOnlyRuntime, TimezoneDefinition } from "@time-provider/core";
import type { IManualRuntime, IUtcOnlyManualRuntime } from "../src/types/types.ts";

class FakeRuntime {
  constructor(
    readonly localTimezone: TimezoneDefinition,
    readonly initialTime: unknown,
  ) {}
}

class FakeDeterministicPlugin extends BaseDeterministicPlugin<unknown> {
  protected readonly ManualRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    initialTime: unknown,
  ) => IManualRuntime<unknown>;
  protected readonly FixedRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    initialTime: unknown,
  ) => IRuntime<unknown>;
  protected readonly SequentialRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: unknown[],
  ) => IRuntime<unknown>;
}

class FakeUtcOnlyDeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<unknown> {
  protected readonly ManualRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    initialTime: unknown,
  ) => IUtcOnlyManualRuntime<unknown>;
  protected readonly FixedRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    initialTime: unknown,
  ) => IUtcOnlyRuntime<unknown>;
  protected readonly SequentialRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: unknown[],
  ) => IUtcOnlyRuntime<unknown>;
}

describe("BaseUtcOnlyDeterministicPlugin", () => {
  test("does not support local time", () => {
    expect(new FakeUtcOnlyDeterministicPlugin().supportsLocalTime).toBe(false);
  });

  test.each([
    [
      "createManualRuntime",
      (plugin: FakeUtcOnlyDeterministicPlugin) => plugin.createManualRuntime(0),
    ],
    [
      "createFixedRuntime",
      (plugin: FakeUtcOnlyDeterministicPlugin) => plugin.createFixedRuntime(0),
    ],
    [
      "createSequentialRuntime",
      (plugin: FakeUtcOnlyDeterministicPlugin) => plugin.createSequentialRuntime([0]),
    ],
  ] as const)("%s pins the runtime to Etc/UTC", (_name, create) => {
    const runtime = create(new FakeUtcOnlyDeterministicPlugin());
    expect((runtime as unknown as FakeRuntime).localTimezone).toBe("Etc/UTC");
  });
});

describe("BaseDeterministicPlugin", () => {
  test("supports local time", () => {
    expect(new FakeDeterministicPlugin().supportsLocalTime).toBe(true);
  });
});
