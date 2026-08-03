import { describe, expect, test } from "vite-plus/test";
import { BaseSystemPlugin, BaseUtcOnlySystemPlugin } from "@time-provider/core";
import type { IRuntime, IUtcOnlyRuntime, TimezoneDefinition } from "@time-provider/core";

class FakeRuntime {
  constructor(readonly localTimezone: TimezoneDefinition) {}
}

class FakeSystemPlugin extends BaseSystemPlugin<unknown> {
  protected readonly SystemRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
  ) => IRuntime<unknown>;
}

class FakeUtcOnlySystemPlugin extends BaseUtcOnlySystemPlugin<unknown> {
  protected readonly SystemRuntimeCtor = FakeRuntime as unknown as new (
    localTimezone: TimezoneDefinition,
  ) => IUtcOnlyRuntime<unknown>;
}

describe("BaseSystemPlugin", () => {
  test("supports local time", () => {
    expect(new FakeSystemPlugin().supportsLocalTime).toBe(true);
  });

  test("createSystemRuntime instantiates the configured runtime constructor with the given timezone", () => {
    const runtime = new FakeSystemPlugin().createSystemRuntime("Pacific/Kiritimati");
    expect(runtime).toBeInstanceOf(FakeRuntime);
    expect((runtime as unknown as FakeRuntime).localTimezone).toBe("Pacific/Kiritimati");
  });
});

describe("BaseUtcOnlySystemPlugin", () => {
  test("does not support local time", () => {
    expect(new FakeUtcOnlySystemPlugin().supportsLocalTime).toBe(false);
  });

  test("createSystemRuntime instantiates the configured runtime constructor pinned to Etc/UTC", () => {
    const runtime = new FakeUtcOnlySystemPlugin().createSystemRuntime();
    expect(runtime).toBeInstanceOf(FakeRuntime);
    expect((runtime as unknown as FakeRuntime).localTimezone).toBe("Etc/UTC");
  });
});
