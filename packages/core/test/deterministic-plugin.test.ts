import { describe, expect, test } from "vite-plus/test";
import {
  BaseDeterministicPlugin,
  BaseUtcOnlyDeterministicPlugin,
} from "../src/plugins/deterministic-plugin.ts";
import type { TimezoneDefinition } from "@time-provider/core";
import type { IDeterministicRuntime, IUtcOnlyDeterministicRuntime } from "../src/types/types.ts";
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
  ) => IDeterministicRuntime<unknown>;
  protected readonly SequentialRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: unknown[],
  ) => IDeterministicRuntime<unknown>;
}

class FakeUtcOnlyDeterministicPlugin extends BaseUtcOnlyDeterministicPlugin<unknown> {
  protected readonly ManualRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    initialTime: unknown,
  ) => IUtcOnlyManualRuntime<unknown>;
  protected readonly FixedRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    initialTime: unknown,
  ) => IUtcOnlyDeterministicRuntime<unknown>;
  protected readonly SequentialRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: unknown[],
  ) => IUtcOnlyDeterministicRuntime<unknown>;
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
