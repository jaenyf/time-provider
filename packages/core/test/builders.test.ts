import { describe, expect, test } from "vite-plus/test";
import {
  createTimeProvider,
  type ISystemAddon,
  type ISystemPlugin,
  type IUtcOnlySystemPlugin,
} from "@time-provider/core";
import {
  createTimeProvider as createDeterministicTimeProvider,
  type IDeterministicPlugin,
  type IDeterministicPluggedRuntimeBuilder,
  type IDeterministicAddon,
} from "@time-provider/core/deterministic";

function fakeSystemPlugin(): IUtcOnlySystemPlugin<unknown> {
  return {
    supportsLocalTime: false,
    createSystemRuntime: () =>
      ({}) as ReturnType<IUtcOnlySystemPlugin<unknown>["createSystemRuntime"]>,
  };
}

function fakeTimezoneCapturingSystemPlugin(): {
  plugin: ISystemPlugin<unknown>;
  getLastTimezone: () => string | undefined;
} {
  let lastTimezone: string | undefined;
  const plugin: ISystemPlugin<unknown> = {
    supportsLocalTime: true,
    createSystemRuntime: (timezone) => {
      lastTimezone = timezone;
      return {} as ReturnType<ISystemPlugin<unknown>["createSystemRuntime"]>;
    },
  };
  return { plugin, getLastTimezone: () => lastTimezone };
}

function fakeTimezoneCapturingDeterministicPlugin(): {
  plugin: IDeterministicPlugin<unknown>;
  getLastTimezone: () => string | undefined;
} {
  let lastTimezone: string | undefined;
  type Plugin = IDeterministicPlugin<unknown>;
  const plugin: Plugin = {
    supportsLocalTime: true,
    createManualRuntime: (timezone) => {
      lastTimezone = timezone;
      return {} as ReturnType<Plugin["createManualRuntime"]>;
    },
    createFixedRuntime: (timezone) => {
      lastTimezone = timezone;
      return {} as ReturnType<Plugin["createFixedRuntime"]>;
    },
    createSequentialRuntime: (timezone) => {
      lastTimezone = timezone;
      return {} as ReturnType<Plugin["createSequentialRuntime"]>;
    },
  };
  return { plugin, getLastTimezone: () => lastTimezone };
}

function fakeSequentialTimesCapturingDeterministicPlugin(): {
  plugin: IDeterministicPlugin<unknown>;
  getLastSequentialTimes: () => readonly unknown[] | undefined;
} {
  let lastSequentialTimes: readonly unknown[] | undefined;
  type Plugin = IDeterministicPlugin<unknown>;
  const plugin: Plugin = {
    supportsLocalTime: true,
    createManualRuntime: () => ({}) as ReturnType<Plugin["createManualRuntime"]>,
    createFixedRuntime: () => ({}) as ReturnType<Plugin["createFixedRuntime"]>,
    createSequentialRuntime: (_timezone, sequentialTimes) => {
      lastSequentialTimes = sequentialTimes;
      return {} as ReturnType<Plugin["createSequentialRuntime"]>;
    },
  };
  return { plugin, getLastSequentialTimes: () => lastSequentialTimes };
}

function fakeDeterministicPlugin(): IDeterministicPlugin<unknown> {
  type Plugin = IDeterministicPlugin<unknown>;
  return {
    supportsLocalTime: true,
    createManualRuntime: () => ({}) as ReturnType<Plugin["createManualRuntime"]>,
    createFixedRuntime: () => ({}) as ReturnType<Plugin["createFixedRuntime"]>,
    createSequentialRuntime: () => ({}) as ReturnType<Plugin["createSequentialRuntime"]>,
  };
}

function fakeSystemAddon(): {
  addon: ISystemAddon<unknown, unknown>;
  calls: { applyToRuntime: number; clone: number };
} {
  const calls = { applyToRuntime: 0, clone: 0 };
  const addon = {
    applyToRuntime: (runtime: unknown) => {
      calls.applyToRuntime++;
      return runtime;
    },
    clone: () => {
      calls.clone++;
      return addon;
    },
  };
  return { addon: addon as unknown as ISystemAddon<unknown, unknown>, calls };
}

function fakeCollidingSystemAddon(): ISystemAddon<unknown, unknown> {
  const addon = {
    // Collides with ISystemPluggedRuntimeBuilder's own `create()` method.
    create: () => undefined,
    applyToRuntime: (runtime: unknown) => runtime,
    clone: () => addon,
  };
  return addon as unknown as ISystemAddon<unknown, unknown>;
}

/**
 * Every plain addon has the exact same `applyToRuntime`/`clone` member names - a second addon
 * with no other members of its own, like this one.
 */
function fakeOtherSystemAddon(): ISystemAddon<unknown, unknown> {
  const addon = {
    applyToRuntime: (runtime: unknown) => runtime,
    clone: () => addon,
  };
  return addon as unknown as ISystemAddon<unknown, unknown>;
}

/** An addon that also extends the builder chain itself with a non-colliding extra method. */
function fakeSystemAddonWithBuilderExtra(): ISystemAddon<unknown, unknown> & {
  withExtra(): string;
} {
  const addon = {
    applyToRuntime: (runtime: unknown) => runtime,
    clone: () => addon,
    withExtra: () => "extra-value",
  };
  return addon as unknown as ISystemAddon<unknown, unknown> & { withExtra(): string };
}

function fakeDeterministicAddon(): {
  addon: IDeterministicAddon<unknown, unknown>;
  calls: { applyToRuntime: number; clone: number };
} {
  const calls = { applyToRuntime: 0, clone: 0 };
  const addon = {
    applyToRuntime: (runtime: unknown) => {
      calls.applyToRuntime++;
      return runtime;
    },
    clone: () => {
      calls.clone++;
      return addon;
    },
  };
  return { addon: addon as unknown as IDeterministicAddon<unknown, unknown>, calls };
}

function fakeCollidingDeterministicAddon(): IDeterministicAddon<unknown, unknown> {
  const addon = {
    // Collides with IDeterministicPluggedRuntimeBuilder's own `asManual()` method.
    asManual: () => undefined,
    applyToRuntime: (runtime: unknown) => runtime,
    clone: () => addon,
  };
  return addon as unknown as IDeterministicAddon<unknown, unknown>;
}

/**
 * Every plain addon has the exact same `applyToRuntime`/`clone` member names - a second addon
 * with no other members of its own, like this one.
 */
function fakeOtherDeterministicAddon(): IDeterministicAddon<unknown, unknown> {
  const addon = {
    applyToRuntime: (runtime: unknown) => runtime,
    clone: () => addon,
  };
  return addon as unknown as IDeterministicAddon<unknown, unknown>;
}

/** An addon that also extends the builder chain itself with a non-colliding extra method. */
function fakeDeterministicAddonWithBuilderExtra(): IDeterministicAddon<unknown, unknown> & {
  withExtra(): string;
} {
  const addon = {
    applyToRuntime: (runtime: unknown) => runtime,
    clone: () => addon,
    withExtra: () => "extra-value",
  };
  return addon as unknown as IDeterministicAddon<unknown, unknown> & { withExtra(): string };
}

describe("RuntimeBuilder", () => {
  describe("for", () => {
    test.each([undefined, null])("throws a descriptive error for %s plugin", (undefinedValue) => {
      expect(() => {
        createTimeProvider.for(undefinedValue as unknown as IUtcOnlySystemPlugin<unknown>);
      }).toThrow("The given plugin is not defined");
    });

    test("uses the given timezone by default, not the host's", () => {
      const { plugin, getLastTimezone } = fakeTimezoneCapturingSystemPlugin();
      createTimeProvider.for(plugin).create();
      expect(getLastTimezone()).toBe("Etc/UTC");
    });
  });
});

describe("SystemPluggedRuntimeBuilder", () => {
  describe("use", () => {
    test("clones the given addon", () => {
      const { addon, calls } = fakeSystemAddon();
      createTimeProvider.for(fakeSystemPlugin()).use(addon);
      expect(calls.clone).toBe(1);
    });

    test("returns the builder, for chaining", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      expect(builder.use(fakeSystemAddon().addon)).toBe(builder);
    });

    test("throws instead of silently shadowing an existing builder method", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      expect(() => builder.use<unknown>(fakeCollidingSystemAddon())).toThrow(/collides/);
    });

    test("composes with a second, different addon - not a false collision on applyToRuntime/clone", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      expect(() =>
        builder.use<unknown>(fakeSystemAddon().addon).use<unknown>(fakeOtherSystemAddon()),
      ).not.toThrow();
    });

    test("applying the same addon a second time doesn't falsely collide either", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      const { addon } = fakeSystemAddon();
      expect(() => builder.use<unknown>(addon).use<unknown>(addon)).not.toThrow();
    });

    test("splices an addon's own extra builder-chain method onto the builder", () => {
      const builder = createTimeProvider
        .for(fakeSystemPlugin())
        .use(fakeSystemAddonWithBuilderExtra());
      expect(builder.withExtra()).toBe("extra-value");
    });
  });

  describe("create", () => {
    test("applies every used addon to the created runtime", () => {
      const { addon, calls } = fakeSystemAddon();
      createTimeProvider.for(fakeSystemPlugin()).use(addon).create();
      expect(calls.applyToRuntime).toBe(1);
    });

    test("never applies an addon that was never used", () => {
      const { calls } = fakeSystemAddon();
      createTimeProvider.for(fakeSystemPlugin()).create();
      expect(calls.applyToRuntime).toBe(0);
    });

    test("applies every used addon when two different addons are composed", () => {
      const { addon: addonA, calls: callsA } = fakeSystemAddon();
      const addonB = fakeOtherSystemAddon();
      createTimeProvider.for(fakeSystemPlugin()).use<unknown>(addonA).use<unknown>(addonB).create();
      expect(callsA.applyToRuntime).toBe(1);
    });
  });
});

describe("DeterministicRuntimeBuilder", () => {
  describe("for", () => {
    test("uses the given timezone by default, not the host's", () => {
      const { plugin, getLastTimezone } = fakeTimezoneCapturingDeterministicPlugin();
      createDeterministicTimeProvider.for(plugin).asFixed().create();
      expect(getLastTimezone()).toBe("Etc/UTC");
    });
  });
});

describe("DeterministicPluggedRuntimeBuilder", () => {
  describe("asSequential().create()", () => {
    test("defaults to a single epoch-0 entry when withSequentialTime was never called", () => {
      const { plugin, getLastSequentialTimes } = fakeSequentialTimesCapturingDeterministicPlugin();
      createDeterministicTimeProvider.for(plugin).asSequential().create();
      expect(getLastSequentialTimes()).toEqual([0]);
    });
  });

  describe("use", () => {
    test("clones the given addon", () => {
      const { addon, calls } = fakeDeterministicAddon();
      createDeterministicTimeProvider.for(fakeDeterministicPlugin()).use(addon);
      expect(calls.clone).toBe(1);
    });

    test("returns the builder, for chaining", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      expect(builder.use(fakeDeterministicAddon().addon)).toBe(builder);
    });

    test("throws instead of silently shadowing an existing builder method", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      expect(() => builder.use<unknown>(fakeCollidingDeterministicAddon())).toThrow(/collides/);
    });

    test("composes with a second, different addon - not a false collision on applyToRuntime/clone", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      expect(() =>
        builder
          .use<unknown>(fakeDeterministicAddon().addon)
          .use<unknown>(fakeOtherDeterministicAddon()),
      ).not.toThrow();
    });

    test("applying the same addon a second time doesn't falsely collide either", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      const { addon } = fakeDeterministicAddon();
      expect(() => builder.use<unknown>(addon).use<unknown>(addon)).not.toThrow();
    });

    test("splices an addon's own extra builder-chain method onto the builder", () => {
      const builder = createDeterministicTimeProvider
        .for(fakeDeterministicPlugin())
        .use(fakeDeterministicAddonWithBuilderExtra());
      expect(builder.withExtra()).toBe("extra-value");
    });
  });

  describe.each([
    [
      "asFixed",
      (builder: IDeterministicPluggedRuntimeBuilder<unknown>) => builder.asFixed().create(),
    ],
    [
      "asManual",
      (builder: IDeterministicPluggedRuntimeBuilder<unknown>) => builder.asManual().create(),
    ],
    [
      "asSequential",
      (builder: IDeterministicPluggedRuntimeBuilder<unknown>) => builder.asSequential().create(),
    ],
  ] as const)("%s().create()", (_name, create) => {
    test("applies every used addon to the created runtime", () => {
      const { addon, calls } = fakeDeterministicAddon();
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin()).use(addon);
      create(builder);
      expect(calls.applyToRuntime).toBe(1);
    });

    test("never applies an addon that was never used", () => {
      const { calls } = fakeDeterministicAddon();
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      create(builder);
      expect(calls.applyToRuntime).toBe(0);
    });

    test("applies every used addon when two different addons are composed", () => {
      const { addon: addonA, calls: callsA } = fakeDeterministicAddon();
      const addonB = fakeOtherDeterministicAddon();
      const builder = createDeterministicTimeProvider
        .for(fakeDeterministicPlugin())
        .use<unknown>(addonA)
        .use<unknown>(addonB);
      create(builder);
      expect(callsA.applyToRuntime).toBe(1);
    });
  });
});
