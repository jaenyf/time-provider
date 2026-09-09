import { describe, expect, test } from "vite-plus/test";
import { AddonHelper, IAddon, IRuntime } from "@time-provider/core";

describe("AddonHelper", () => {
  function createFakeRuntime(): IRuntime<unknown> {
    return { registerAddon: (_addon: IAddon<unknown>) => {} } as IRuntime<unknown>;
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
  });
});
