import { describe, expect, test } from "vite-plus/test";
import type { DateTime } from "luxon";
import { RuntimeHelper } from "../src/plugin/runtime-helper.ts";

describe("RuntimeHelper", () => {
  describe("convertToUtcDate", () => {
    test("parses a zoneless ISO string as UTC, not the host's default zone", () => {
      expect(RuntimeHelper.convertToUtcDate("2026-06-15T10:30:00").toISO()).toMatch(/Z$/);
    });

    test("throws when given a non-DateTime object that merely looks valid", () => {
      const fakeDateTimeLike = { isValid: true } as unknown as DateTime<boolean>;
      expect(() => RuntimeHelper.convertToUtcDate(fakeDateTimeLike)).toThrow("Invalid time value");
    });
  });
});
