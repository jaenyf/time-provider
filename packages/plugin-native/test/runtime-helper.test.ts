import { describe, expect, test } from "vite-plus/test";
import { RuntimeHelper } from "../src/plugin/runtime-helper.ts";

describe("RuntimeHelper", () => {
  describe("convertToUtcDate", () => {
    test("throws when the parsed date is invalid", () => {
      expect(() => RuntimeHelper.convertToUtcDate("not a valid iso timestamp string")).toThrow(
        "Invalid time value",
      );
    });
  });
});
