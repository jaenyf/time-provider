import { describe, expect, test } from "vite-plus/test";
import { AddonHelper, IAddon, IRuntime } from "@time-provider/core";

describe("AddonHelper", () => {
  function createFakeRuntime(): IRuntime<unknown> {
    return { registerAddon: (_addon: IAddon) => {} } as IRuntime<unknown>;
  }

  describe("extendRuntimeWithProperty", () => {
    test("attaches the property to the given runtime and returns it", () => {
      const original = createFakeRuntime();
      const runtime = AddonHelper.extendRuntimeWithProperty(original, "extra", {
        value: 1,
      } as unknown as IAddon);
      expect(runtime).toBe(original);
      expect((runtime as unknown as { extra: unknown }).extra).toEqual({ value: 1 });
    });

    test("defines the property as enumerable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty(createFakeRuntime(), "extra", {
        value: 1,
      } as unknown as IAddon);
      expect(Object.keys(runtime)).toContain("extra");
    });

    test("defines the property as non-configurable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty(createFakeRuntime(), "extra", {
        value: 1,
      } as unknown as IAddon);
      expect(() => Object.defineProperty(runtime, "extra", { value: { value: 2 } })).toThrow();
    });

    test("defines the property as non-writable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty(createFakeRuntime(), "extra", {
        value: 1,
      } as unknown as IAddon) as unknown as {
        extra: unknown;
      };
      expect(() => {
        runtime.extra = { value: 2 };
      }).toThrow();
    });
  });
});
