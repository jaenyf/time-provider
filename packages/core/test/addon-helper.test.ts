import { describe, expect, test } from "vite-plus/test";
import { AddonHelper } from "@time-provider/core";

describe("AddonHelper", () => {
  describe("extendRuntimeWithProperty", () => {
    test("attaches the property to the given runtime and returns it", () => {
      const original = {};
      const runtime = AddonHelper.extendRuntimeWithProperty(original, "extra", { value: 1 });
      expect(runtime).toBe(original);
      expect((runtime as unknown as { extra: unknown }).extra).toEqual({ value: 1 });
    });

    test("defines the property as enumerable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty({}, "extra", { value: 1 });
      expect(Object.keys(runtime)).toContain("extra");
    });

    test("defines the property as non-configurable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty({}, "extra", { value: 1 });
      expect(() => Object.defineProperty(runtime, "extra", { value: { value: 2 } })).toThrow();
    });

    test("defines the property as non-writable", () => {
      const runtime = AddonHelper.extendRuntimeWithProperty({}, "extra", { value: 1 }) as {
        extra: unknown;
      };
      expect(() => {
        runtime.extra = { value: 2 };
      }).toThrow();
    });
  });
});
