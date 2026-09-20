import { describe, expect, test } from "vite-plus/test";
import { AddonHelper, IAddon, IRuntime } from "@time-provider/core";

describe("AddonHelper", () => {
  function createFakeRuntime(): IRuntime<unknown> {
    return { registerAddon: (_addon: IAddon<unknown>) => {} } as IRuntime<unknown>;
  }

  /*
    A real runtime's `scheduler` getter returns the runtime itself, so a fake that keeps the two
    apart is what actually proves which of them a helper attaches to.
  */
  function createFakeRuntimeWithOwnScheduler(): IRuntime<unknown> & { scheduler: object } {
    return {
      scheduler: {},
      registerAddon: (_addon: IAddon<unknown>) => {},
    } as unknown as IRuntime<unknown> & { scheduler: object };
  }

  describe("extendRuntimeWithProperty", () => {
    const fakeAddon = {} as unknown as IAddon<unknown>;

    test("attaches the property to the given runtime and returns it", () => {
      const original = createFakeRuntime();
      const runtime = AddonHelper.extendRuntimeWithProperty(
        original,
        "extra",
        { value: 1 },
        fakeAddon,
      );
      expect(runtime).toBe(original);
      expect((runtime as unknown as { extra: unknown }).extra).toEqual({ value: 1 });
    });

    test("defines the property as enumerable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty(
        createFakeRuntime(),
        "extra",
        { value: 1 },
        fakeAddon,
      );
      expect(Object.keys(runtime)).toContain("extra");
    });

    test("defines the property as non-configurable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty(
        createFakeRuntime(),
        "extra",
        { value: 1 },
        fakeAddon,
      );
      expect(() => Object.defineProperty(runtime, "extra", { value: { value: 2 } })).toThrow();
    });

    test("defines the property as non-writable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty(
        createFakeRuntime(),
        "extra",
        { value: 1 },
        fakeAddon,
      ) as unknown as {
        extra: unknown;
      };
      expect(() => {
        runtime.extra = { value: 2 };
      }).toThrow();
    });

    test("registers the addon instance, not the facade, for the runtime's own disposal tracking", () => {
      let registered: unknown;
      const runtime = {
        registerAddon: (addon: IAddon<unknown>) => {
          registered = addon;
        },
      } as unknown as IRuntime<unknown>;
      const addon = { dispose: () => {} } as unknown as IAddon<unknown>;
      AddonHelper.extendRuntimeWithProperty(runtime, "extra", { value: 1 }, addon);
      expect(registered).toBe(addon);
    });

    test("walks a dotted path and attaches to the facet it names, not to the runtime", () => {
      const original = createFakeRuntimeWithOwnScheduler();
      const runtime = AddonHelper.extendRuntimeWithProperty(
        original,
        "scheduler.extra",
        { value: 1 },
        fakeAddon,
      );
      expect(runtime).toBe(original);
      expect((original.scheduler as unknown as { extra: unknown }).extra).toEqual({ value: 1 });
      expect(Object.getOwnPropertyDescriptor(original, "extra")).toBeUndefined();
    });

    test("defines a dotted path's property as enumerable, non-configurable and non-writable", () => {
      const original = createFakeRuntimeWithOwnScheduler();
      AddonHelper.extendRuntimeWithProperty(original, "scheduler.extra", { value: 1 }, fakeAddon);
      const scheduler = original.scheduler as unknown as { extra: unknown };
      expect(Object.keys(scheduler)).toContain("extra");
      expect(() => Object.defineProperty(scheduler, "extra", { value: { value: 2 } })).toThrow();
      expect(() => {
        scheduler.extra = { value: 2 };
      }).toThrow();
    });

    test("registers the addon with the runtime even when the path names a facet", () => {
      let registered: unknown;
      const original = {
        scheduler: {},
        registerAddon: (addon: IAddon<unknown>) => {
          registered = addon;
        },
      } as unknown as IRuntime<unknown>;
      const addon = { dispose: () => {} } as unknown as IAddon<unknown>;
      AddonHelper.extendRuntimeWithProperty(original, "scheduler.extra", { value: 1 }, addon);
      expect(registered).toBe(addon);
    });

    test("throws, naming the missing segment, when the path's host is not there", () => {
      const original = createFakeRuntime();
      expect(() =>
        AddonHelper.extendRuntimeWithProperty(original, "compat.extra", { value: 1 }, fakeAddon),
      ).toThrow("'compat' does not exist");
    });

    test("does nothing at all when the host is missing and the path is optional", () => {
      let registered = false;
      const original = {
        registerAddon: () => {
          registered = true;
        },
      } as unknown as IRuntime<unknown> & { compat?: unknown };
      const runtime = AddonHelper.extendRuntimeWithProperty(
        original,
        "compat.extra",
        { value: 1 },
        fakeAddon,
        true,
      );
      expect(runtime).toBe(original);
      expect(original.compat).toBeUndefined();
      expect(registered).toBe(false);
    });

    test("still attaches when the path is optional and its host is there", () => {
      const original = createFakeRuntimeWithOwnScheduler();
      AddonHelper.extendRuntimeWithProperty(
        original,
        "scheduler.extra",
        { value: 1 },
        fakeAddon,
        true,
      );
      expect((original.scheduler as { extra?: unknown }).extra).toStrictEqual({ value: 1 });
    });
  });
});
