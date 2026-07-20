import { expect, test, describe } from "vite-plus/test";
import type { ITimeProvider, IUtcOnlyTimeProvider } from "@time-provider/core";

export function testTimeProvider<TDate>(
  getTimeProvider: () => ITimeProvider<TDate> | IUtcOnlyTimeProvider<TDate>,
) {
  describe("createTimeProvider", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(getTimeProvider()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof getTimeProvider()).toBe("object");
    });
  });
}
