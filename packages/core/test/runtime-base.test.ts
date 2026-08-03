import { describe, expect, test } from "vite-plus/test";
import { TimeInputValidator } from "@time-provider/core";

describe("TimeInputValidator", () => {
  describe("assertValid", () => {
    test.each([undefined, null, Number.NaN, "", "   "])(
      "throws for %s",
      (invalidValue: unknown) => {
        expect(() => TimeInputValidator.assertValid(invalidValue as string)).toThrow();
      },
    );

    test.each([0, -1, 1, "x", "0", {}])("does not throw for %s", (validValue: unknown) => {
      expect(() => TimeInputValidator.assertValid(validValue as string)).not.toThrow();
    });
  });
});
