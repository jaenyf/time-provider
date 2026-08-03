import type { IParser, IUtcOnlyParser } from "@time-provider/core";
import { describe, expect, test } from "vite-plus/test";

export function testParser<TDate>(
  supportsLocalTime: boolean,
  createSut: () => IParser<TDate> | IUtcOnlyParser<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  /*
    `roundtrip` stands in for a TDate sample in each `test.each` case list. The sample must
    be resolved lazily, inside the test body, rather than eagerly while building the case list.
    Otherwise a broken plugin (or a Stryker mutant) throwing there would crash the whole describe
    block during collection, silently skipping every case instead of failing just the one test.
   */
  const roundtrip = Symbol("roundtrip");
  type LocalCase = string | number | typeof roundtrip;
  const resolveLocal = (toParse: LocalCase): string | number | TDate =>
    toParse === roundtrip ? parseTimeToLocal("2026-01-01T00:00:00.000Z") : toParse;
  const resolveUtc = (toParse: LocalCase): string | number | TDate =>
    toParse === roundtrip ? parseTimeToUtc("2026-01-01T00:00:00.000Z") : toParse;

  describe.skipIf(!supportsLocalTime)("parseToLocal", () => {
    test.each<LocalCase>(["2026-01-01T00:00Z", 100, roundtrip])("doesn't throw", (toParse) => {
      expect(() =>
        (createSut() as IParser<TDate>).parseToLocal(resolveLocal(toParse)),
      ).not.toThrow();
    });
    test.each<LocalCase>(["2026-01-01T00:00Z", 100, roundtrip])("returns a value", (toParse) => {
      const parsed = resolveLocal(toParse);
      expect((createSut() as IParser<TDate>).parseToLocal(parsed)).not.toEqual(undefined);
      expect((createSut() as IParser<TDate>).parseToLocal(parsed)).not.toEqual(null);
    });
    test.each<LocalCase>(["2026-01-01T00:00Z", 100, roundtrip])(
      "aligns with native TDate construction",
      (toParse) => {
        const parsed = resolveLocal(toParse);
        expect((createSut() as IParser<TDate>).parseToLocal(parsed)).toEqual(
          parseTimeToLocal(parsed),
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
    test.each<LocalCase>(["2026-01-01T00:00Z", 100, roundtrip])("doesn't throw", (toParse) => {
      expect(() => createSut().parseToUtc(resolveUtc(toParse))).not.toThrow();
    });
    test.each<LocalCase>(["2026-01-01T00:00Z", 100, roundtrip])("returns a value", (toParse) => {
      const parsed = resolveUtc(toParse);
      expect(createSut().parseToUtc(parsed)).not.toEqual(undefined);
      expect(createSut().parseToUtc(parsed)).not.toEqual(null);
    });
    test.each<LocalCase>(["2026-01-01T00:00Z", 100, roundtrip])(
      "aligns with native TDate construction",
      (toParse) => {
        const parsed = resolveUtc(toParse);
        expect(createSut().parseToUtc(parsed)).toEqual(parseTimeToUtc(parsed));
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
