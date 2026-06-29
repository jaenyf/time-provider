import { expect, test, describe } from "vite-plus/test";
import type { ITimeProvider } from "@time-provider/core";

export function testFixedTimeProvider<TDate>(getFixedTimeProvider: () => ITimeProvider<TDate>) {
  describe("createFixedTimeProvider", () => {
    test.each([null, undefined])("returns a value", (undefinedValue) => {
      expect(getFixedTimeProvider()).not.toBe(undefinedValue);
    });
    test("creates an object", () => {
      expect(typeof getFixedTimeProvider()).toBe("object");
    });
  });
}
