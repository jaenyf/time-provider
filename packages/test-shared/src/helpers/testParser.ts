import type { IParser, IUtcOnlyParser } from "@time-provider/core";
import { describe, expect, test } from "vite-plus/test";

export function testParser<TDate>(
  supportsLocalTime: boolean,
  createSut: () => IParser<TDate> | IUtcOnlyParser<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  /*
    skipIf guard only protect test run, but test samples (for `each) are evaluated eagerly.
    Therefore, we ensure it's populated with values.
   */
  const localTimeSample = supportsLocalTime
    ? parseTimeToLocal("2026-01-01T00:00:00.000Z")
    : (undefined as unknown as TDate);

  describe.skipIf(!supportsLocalTime)("parseToLocal", () => {
    test.each(["2026-01-01T00:00Z", 100, localTimeSample])(
      "doesn't throw",
      (toParse: string | number | TDate) => {
        expect(() => (createSut() as IParser<TDate>).parseToLocal(toParse)).not.toThrow();
      },
    );
    test.each(["2026-01-01T00:00Z", 100, localTimeSample])(
      "returns a value",
      (toParse: string | number | TDate) => {
        expect((createSut() as IParser<TDate>).parseToLocal(toParse)).not.toEqual(undefined);
        expect((createSut() as IParser<TDate>).parseToLocal(toParse)).not.toEqual(null);
      },
    );
    test.each(["2026-01-01T00:00Z", 100, localTimeSample])(
      "aligns with native TDate construction",
      (toParse: string | number | TDate) => {
        expect((createSut() as IParser<TDate>).parseToLocal(toParse)).toEqual(
          parseTimeToLocal(toParse),
        );
      },
    );
    test.each([
      "not a valid iso timestamp string",
      "",
      "202B-01-01T00:00Z",
      "2026-0I-01T00:00Z",
      "2026-01-0IT00:00Z",
      "2026-01-01TOO:00Z",
      "2026-01-01T00:OOZ",
      Number("NaN"),
      undefined as unknown as number,
      null as unknown as number,
      undefined as unknown as string,
      null as unknown as string,
      undefined as unknown as TDate,
      null as unknown as TDate,
    ])("throws on invalid time", (toParse: string | number | TDate) => {
      expect(() => {
        (createSut() as IParser<TDate>).parseToLocal(toParse);
      }).toThrow();
    });
  });
  describe("parseToUtc", () => {
    test.each(["2026-01-01T00:00Z", 100, parseTimeToUtc("2026-01-01T00:00:00.000Z")])(
      "doesn't throw",
      (toParse: string | number | TDate) => {
        expect(() => createSut().parseToUtc(toParse)).not.toThrow();
      },
    );
    test.each(["2026-01-01T00:00Z", 100, parseTimeToUtc("2026-01-01T00:00:00.000Z")])(
      "returns a value",
      (toParse: string | number | TDate) => {
        expect(createSut().parseToUtc(toParse)).not.toEqual(undefined);
        expect(createSut().parseToUtc(toParse)).not.toEqual(null);
      },
    );
    test.each(["2026-01-01T00:00Z", 100, parseTimeToUtc("2026-01-01T00:00:00.000Z")])(
      "aligns with native TDate construction",
      (toParse: string | number | TDate) => {
        expect(createSut().parseToUtc(toParse)).toEqual(parseTimeToUtc(toParse));
      },
    );
    test.each([
      "not a valid iso timestamp string",
      "",
      "202B-01-01T00:00Z",
      "2026-0I-01T00:00Z",
      "2026-01-0IT00:00Z",
      "2026-01-01TOO:00Z",
      "2026-01-01T00:OOZ",
      Number("NaN"),
      undefined as unknown as number,
      null as unknown as number,
      undefined as unknown as string,
      null as unknown as string,
      undefined as unknown as TDate,
      null as unknown as TDate,
    ])("throws on invalid time", (toParse: string | number | TDate) => {
      expect(() => {
        createSut().parseToUtc(toParse);
      }).toThrow();
    });
  });
}
