import type { IConverter, IUtcOnlyConverter } from "@time-provider/core";
import { describe, expect, test } from "vite-plus/test";
import fc from "fast-check";
import { assertProperty } from "../property-run.ts";

export function testConverter<TDate>(
  supportsLocalTime: boolean,
  createSut: () => IConverter<TDate> | IUtcOnlyConverter<TDate>,
  parseTimeToUtc: (initialValue: string | number | TDate) => TDate,
  parseTimeToLocal: (initialValue: string | number | TDate) => TDate,
) {
  /*
    A `roundtrip` case stands in for a TDate sample. The sample must be resolved lazily, inside
    the test body, rather than while the case is generated. Otherwise a broken plugin (or a
    Stryker mutant) throwing there would fail the generation instead of the assertion, hiding
    which input actually broke.
   */
  type LocalCase = string | number | { readonly roundtrip: string };
  const resolveLocal = (toParse: LocalCase): string | number | TDate =>
    typeof toParse === "object" ? parseTimeToLocal(toParse.roundtrip) : toParse;
  const resolveUtc = (toParse: LocalCase): string | number | TDate =>
    typeof toParse === "object" ? parseTimeToUtc(toParse.roundtrip) : toParse;

  const MILLISECONDS_PER_MINUTE = 60_000;
  const anyEpochMilliseconds = fc.integer({ min: 0, max: 4_102_444_800_000 });
  const anyCase: fc.Arbitrary<LocalCase> = fc.oneof(
    anyEpochMilliseconds.map((milliseconds) => new Date(milliseconds).toISOString()),
    anyEpochMilliseconds
      .map((milliseconds) => milliseconds - (milliseconds % MILLISECONDS_PER_MINUTE))
      .map((milliseconds) => new Date(milliseconds).toISOString().replace(":00.000Z", "Z")),
    anyEpochMilliseconds,
    anyEpochMilliseconds.map((milliseconds) => ({
      roundtrip: new Date(milliseconds).toISOString(),
    })),
  );

  const invalidCases = [
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
  ];

  describe.skipIf(!supportsLocalTime)("convertToLocal", () => {
    test("doesn't throw", () => {
      assertProperty(
        fc.property(anyCase, (toParse) => {
          expect(() =>
            (createSut() as IConverter<TDate>).convertToLocal(resolveLocal(toParse)),
          ).not.toThrow();
        }),
      );
    });
    test("returns a value", () => {
      assertProperty(
        fc.property(anyCase, (toParse) => {
          const parsed = resolveLocal(toParse);
          expect((createSut() as IConverter<TDate>).convertToLocal(parsed)).not.toEqual(undefined);
          expect((createSut() as IConverter<TDate>).convertToLocal(parsed)).not.toEqual(null);
        }),
      );
    });
    test("aligns with native TDate construction", () => {
      assertProperty(
        fc.property(anyCase, (toParse) => {
          const parsed = resolveLocal(toParse);
          expect((createSut() as IConverter<TDate>).convertToLocal(parsed)).toEqual(
            parseTimeToLocal(parsed),
          );
        }),
      );
    });
    test.each(invalidCases)("throws on invalid time", (toParse: string | number | TDate) => {
      expect(() => {
        (createSut() as IConverter<TDate>).convertToLocal(toParse);
      }).toThrow();
    });
  });
  describe("convertToUtc", () => {
    test("doesn't throw", () => {
      assertProperty(
        fc.property(anyCase, (toParse) => {
          expect(() => createSut().convertToUtc(resolveUtc(toParse))).not.toThrow();
        }),
      );
    });
    test("returns a value", () => {
      assertProperty(
        fc.property(anyCase, (toParse) => {
          const parsed = resolveUtc(toParse);
          expect(createSut().convertToUtc(parsed)).not.toEqual(undefined);
          expect(createSut().convertToUtc(parsed)).not.toEqual(null);
        }),
      );
    });
    test("aligns with native TDate construction", () => {
      assertProperty(
        fc.property(anyCase, (toParse) => {
          const parsed = resolveUtc(toParse);
          expect(createSut().convertToUtc(parsed)).toEqual(parseTimeToUtc(parsed));
        }),
      );
    });
    test.each(invalidCases)("throws on invalid time", (toParse: string | number | TDate) => {
      expect(() => {
        createSut().convertToUtc(toParse);
      }).toThrow();
    });
  });
}
