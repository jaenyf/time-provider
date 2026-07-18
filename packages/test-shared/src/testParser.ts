import { expect, test, describe } from "vite-plus/test";
import type { IParser } from "@time-provider/core";

export function testParser<TDate>(
  createSUT: () => IParser<TDate>,
  parseTime: (initialValue: string | number | TDate) => TDate,
) {
  describe("parse", () => {
    test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
      "doesn't throw",
      (toParse: string | number | TDate) => {
        const sut = createSUT();
        expect(() => sut.parse(toParse)).not.toThrow();
      },
    );
    test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
      "returns a value",
      (toParse: string | number | TDate) => {
        const sut = createSUT();
        expect(sut.parse(toParse)).not.toEqual(undefined);
        expect(sut.parse(toParse)).not.toEqual(null);
      },
    );
    test.each(["2026-01-01T00:00Z", 100, parseTime("2026-01-01T00:00:00.000Z")])(
      "aligns with native TDate construction",
      (toParse: string | number | TDate) => {
        const sut = createSUT();
        expect(sut.parse(toParse)).toEqual(parseTime(toParse));
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
      "NaN" as unknown as number,
      undefined as unknown as number,
      null as unknown as number,
      undefined as unknown as string,
      null as unknown as string,
      undefined as unknown as TDate,
      null as unknown as TDate,
    ])("throws on invalid time", (toParse: string | number | TDate) => {
      const sut = createSUT();
      expect(() => {
        sut.parse(toParse);
      }).toThrow();
    });
  });
}
