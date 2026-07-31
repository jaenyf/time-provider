import { describe, expect, test } from "vite-plus/test";
import {
  createTimeProvider,
  type ISystemTimeProviderAddon,
  type IUtcOnlySystemPlugin,
} from "@time-provider/core";
import {
  createTimeProvider as createDeterministicTimeProvider,
  type IDeterministicPlugin,
  type IDeterministicPluggedTimeProviderCreator,
  type IDeterministicTimeProviderAddon,
} from "@time-provider/core/deterministic";

function fakeSystemPlugin(): IUtcOnlySystemPlugin<unknown> {
  return {
    supportsLocalTime: false,
    createSystemRuntime: () =>
      ({}) as ReturnType<IUtcOnlySystemPlugin<unknown>["createSystemRuntime"]>,
  };
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
  addon: ISystemTimeProviderAddon<unknown, unknown>;
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
  return { addon: addon as unknown as ISystemTimeProviderAddon<unknown, unknown>, calls };
}

function fakeDeterministicAddon(): {
  addon: IDeterministicTimeProviderAddon<unknown, unknown>;
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
  return { addon: addon as unknown as IDeterministicTimeProviderAddon<unknown, unknown>, calls };
}

describe("SystemPluggedTimeProviderCreator", () => {
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
  });
});

describe("DeterministicPluggedTimeProviderCreator", () => {
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
  });

  describe.each([
    [
      "asFixed",
      (builder: IDeterministicPluggedTimeProviderCreator<unknown>) => builder.asFixed().create(),
    ],
    [
      "asManual",
      (builder: IDeterministicPluggedTimeProviderCreator<unknown>) => builder.asManual().create(),
    ],
    [
      "asSequential",
      (builder: IDeterministicPluggedTimeProviderCreator<unknown>) =>
        builder.asSequential().create(),
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
  });
});
