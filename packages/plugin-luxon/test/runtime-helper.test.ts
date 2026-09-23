import { createRequire } from "node:module";
import { describe, expect, test } from "vite-plus/test";
import type { DateTime } from "luxon";
import { RuntimeHelper } from "../src/plugin/runtime-helper.ts";

describe("RuntimeHelper", () => {
  describe("convertToUtcDate", () => {
    test("parses a zoneless ISO string as UTC, not the host's default zone", () => {
      expect(RuntimeHelper.convertToUtcDate("2026-06-15T10:30:00").toISO()).toMatch(/Z$/);
    });

    test("accepts a DateTime from luxon's CJS build", () => {
      const cjsLuxon = createRequire(import.meta.url)("luxon") as typeof import("luxon");
      const time = cjsLuxon.DateTime.fromISO("2026-06-15T10:30:00Z");
      expect(RuntimeHelper.convertToUtcDate(time).toMillis()).toBe(time.toMillis());
    });

    test("throws when given a non-DateTime object that merely looks valid", () => {
      const fakeDateTimeLike = { isValid: true } as unknown as DateTime<boolean>;
      expect(() => RuntimeHelper.convertToUtcDate(fakeDateTimeLike)).toThrow("Invalid time value");
    });
  });
});
