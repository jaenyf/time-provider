import { describe, expect, test } from "vite-plus/test";
import type { ICalendarScheme } from "@time-provider/core";

/**
 * DST gap/overlap resolution, run against a plugin's own runtime rather than
 * `DefaultCalendarScheme` directly - that algorithm already has its own tests in
 * `@time-provider/core`. This instead guards each local-time-capable plugin's
 * `compose()`/`toTimestamp()` wiring around the same transition.
 */
export function testCalendarSchemeDst<TDate>(
  supportsLocalTime: boolean,
  getCalendarScheme: () => ICalendarScheme<TDate>,
) {
  describe.skipIf(!supportsLocalTime)("DST resolution (Europe/Paris)", () => {
    const paris = "Europe/Paris";

    test("a spring-forward gap resolves to the first instant past it", () => {
      // 2024-03-31 02:30 never happens in Paris; 03:30 CEST is 01:30Z.
      const scheme = getCalendarScheme();
      const composed = scheme.compose(
        { year: 2024, month: 3, day: 31, hour: 2, minute: 30 },
        paris,
      );
      expect(scheme.toTimestamp(composed)).toBe(Date.UTC(2024, 2, 31, 1, 30));
    });

    test("a fall-back overlap resolves to the earlier of the two occurrences", () => {
      // 2024-10-27 02:30 happens twice in Paris; the earlier (CEST) is 00:30Z.
      const scheme = getCalendarScheme();
      const composed = scheme.compose(
        { year: 2024, month: 10, day: 27, hour: 2, minute: 30 },
        paris,
      );
      expect(scheme.toTimestamp(composed)).toBe(Date.UTC(2024, 9, 27, 0, 30));
    });
  });
}
