import { describe, expect, test } from "vite-plus/test";
import {
  createTimeProvider,
  type IAddon,
  type IAddonBuilder,
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

/**
 * A minimal addon-builder factory: `.use()` calls it once to obtain the addon-builder, whose
 * `create()` then returns a fresh addon each time it's called. Records how many addon-builders
 * were built, and how many times `applyToRuntime` ran across every addon `create()` produced.
 */
function fakeAddonBuilder<TAddon extends IAddon<unknown>>(): {
  factory: () => IAddonBuilder<TAddon>;
  calls: { create: number; applyToRuntime: number };
} {
  const calls = { create: 0, applyToRuntime: 0 };
  const factory = () =>
    ({
      create: () => {
        calls.create++;
        return {
          applyToRuntime: (_runtime: unknown) => {
            calls.applyToRuntime++;
          },
        } as unknown as TAddon;
      },
    }) satisfies IAddonBuilder<TAddon>;
  return { factory, calls };
}

/** An addon-builder factory whose builder's own extra property collides with an existing builder member. */
function fakeCollidingAddonBuilder(
  collidingName: string,
): () => IAddonBuilder<ISystemAddon<unknown> & IDeterministicAddon<unknown>> {
  return () =>
    ({
      create: () =>
        ({ applyToRuntime: (runtime: unknown) => runtime }) as unknown as ISystemAddon<unknown> &
          IDeterministicAddon<unknown>,
      [collidingName]: () => undefined,
    }) as unknown as IAddonBuilder<ISystemAddon<unknown> & IDeterministicAddon<unknown>>;
}

/** An addon-builder factory whose builder also extends the runtime-builder chain with a non-colliding extra method. */
function fakeAddonBuilderWithBuilderExtra(): IAddonBuilder<
  ISystemAddon<unknown> & IDeterministicAddon<unknown>
> & {
  withExtra(): string;
} {
  return {
    create: () =>
      ({ applyToRuntime: (runtime: unknown) => runtime }) as unknown as ISystemAddon<unknown> &
        IDeterministicAddon<unknown>,
    withExtra: () => "extra-value",
  };
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
    test("does not build the addon yet - create() is deferred to the runtime-builder's own create()", () => {
      const { factory, calls } = fakeAddonBuilder();
      createTimeProvider.for(fakeSystemPlugin()).use(factory);
      expect(calls.create).toBe(0);
    });

    test("returns the builder, for chaining", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      expect(builder.use(fakeAddonBuilder().factory)).toBe(builder);
    });

    test("throws instead of silently shadowing an existing builder method", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      expect(() => builder.use(fakeCollidingAddonBuilder("withTimezone"))).toThrow(/collides/);
    });

    test("composes with a second, different addon-builder - not a false collision on create", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      expect(() =>
        builder.use(fakeAddonBuilder().factory).use(fakeAddonBuilder().factory),
      ).not.toThrow();
    });

    test("using the same addon-builder factory a second time doesn't falsely collide either", () => {
      const builder = createTimeProvider.for(fakeSystemPlugin());
      const { factory } = fakeAddonBuilder();
      expect(() => builder.use(factory).use(factory)).not.toThrow();
    });

    test("splices an addon-builder's own extra builder-chain method onto the builder", () => {
      const builder = createTimeProvider
        .for(fakeSystemPlugin())
        .use(fakeAddonBuilderWithBuilderExtra);
      expect(builder.withExtra()).toBe("extra-value");
    });
  });

  describe("create", () => {
    test("builds and applies every used addon to the created runtime", () => {
      const { factory, calls } = fakeAddonBuilder();
      createTimeProvider.for(fakeSystemPlugin()).use(factory).create();
      expect(calls.create).toBe(1);
      expect(calls.applyToRuntime).toBe(1);
    });

    test("never builds an addon that was never used", () => {
      const { calls } = fakeAddonBuilder();
      createTimeProvider.for(fakeSystemPlugin()).create();
      expect(calls.create).toBe(0);
    });

    test("applies every used addon when two different addon-builders are composed", () => {
      const { factory: factoryA, calls: callsA } = fakeAddonBuilder();
      const { factory: factoryB, calls: callsB } = fakeAddonBuilder();
      createTimeProvider.for(fakeSystemPlugin()).use(factoryA).use(factoryB).create();
      expect(callsA.applyToRuntime).toBe(1);
      expect(callsB.applyToRuntime).toBe(1);
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
    test("does not build the addon yet - create() is deferred to the strategy builder's own create()", () => {
      const { factory, calls } = fakeAddonBuilder();
      createDeterministicTimeProvider.for(fakeDeterministicPlugin()).use(factory);
      expect(calls.create).toBe(0);
    });

    test("returns the builder, for chaining", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      expect(builder.use(fakeAddonBuilder().factory)).toBe(builder);
    });

    test("throws instead of silently shadowing an existing builder method", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      expect(() => builder.use(fakeCollidingAddonBuilder("asManual"))).toThrow(/collides/);
    });

    test("composes with a second, different addon-builder - not a false collision on create", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      expect(() =>
        builder.use(fakeAddonBuilder().factory).use(fakeAddonBuilder().factory),
      ).not.toThrow();
    });

    test("using the same addon-builder factory a second time doesn't falsely collide either", () => {
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      const { factory } = fakeAddonBuilder();
      expect(() => builder.use(factory).use(factory)).not.toThrow();
    });

    test("splices an addon-builder's own extra builder-chain method onto the builder", () => {
      const builder = createDeterministicTimeProvider
        .for(fakeDeterministicPlugin())
        .use(fakeAddonBuilderWithBuilderExtra);
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
    test("builds and applies every used addon to the created runtime", () => {
      const { factory, calls } = fakeAddonBuilder();
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin()).use(factory);
      create(builder);
      expect(calls.create).toBe(1);
      expect(calls.applyToRuntime).toBe(1);
    });

    test("never builds an addon that was never used", () => {
      const { calls } = fakeAddonBuilder();
      const builder = createDeterministicTimeProvider.for(fakeDeterministicPlugin());
      create(builder);
      expect(calls.create).toBe(0);
    });

    test("applies every used addon when two different addon-builders are composed", () => {
      const { factory: factoryA, calls: callsA } = fakeAddonBuilder();
      const { factory: factoryB, calls: callsB } = fakeAddonBuilder();
      const builder = createDeterministicTimeProvider
        .for(fakeDeterministicPlugin())
        .use(factoryA)
        .use(factoryB);
      create(builder);
      expect(callsA.applyToRuntime).toBe(1);
      expect(callsB.applyToRuntime).toBe(1);
    });
  });
});
