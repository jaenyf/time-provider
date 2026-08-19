import { describe, expect, test } from "vite-plus/test";
import { asEpoch, epochArithmetic, toDuration, toInstant } from "../src/helpers/branded-types.ts";
import type { EpochMilliseconds, DurationMilliseconds } from "../src/types/types.ts";

describe("asEpoch", () => {
  test("returns a spec with 0 milliseconds", () => {
    expect(asEpoch().milliseconds).toBe(0);
  });
});

describe("toInstant", () => {
  test.each([1, 2, 3])("milliseconds converts to milliseconds", (value) => {
    expect(toInstant({ milliseconds: value })).toEqual(value * 1);
  });
  test.each([1, 2, 3])("seconds converts to milliseconds", (value) => {
    expect(toInstant({ seconds: value })).toEqual(value * 1000);
  });
  test.each([1, 2, 3])("minutes converts to milliseconds", (value) => {
    expect(toInstant({ minutes: value })).toEqual(value * 1000 * 60);
  });
  test.each([1, 2, 3])("hours converts to milliseconds", (value) => {
    expect(toInstant({ hours: value })).toEqual(value * 1000 * 60 * 60);
  });
  test.each([1, 2, 3])("days converts to milliseconds", (value) => {
    expect(toInstant({ days: value })).toEqual(value * 1000 * 60 * 60 * 24);
  });

  test.each([-1, -10, -20])("throws with negative milliseconds", (negativeValue) => {
    expect(() => {
      toInstant({ milliseconds: negativeValue });
    }).toThrow("Invalid operation");
  });
  test.each([-1, -10, -20])("throws with negative seconds ", (negativeValue) => {
    expect(() => {
      toInstant({ seconds: negativeValue });
    }).toThrow("Invalid operation");
  });
  test.each([-1, -10, -20])("throws with negative minutes", (negativeValue) => {
    expect(() => {
      toInstant({ minutes: negativeValue });
    }).toThrow("Invalid operation");
  });
  test.each([-1, -10, -20])("throws with negative hours", (negativeValue) => {
    expect(() => {
      toInstant({ hours: negativeValue });
    }).toThrow("Invalid operation");
  });
  test.each([-1, -10, -20])("throws with negative days", (negativeValue) => {
    expect(() => {
      toInstant({ days: negativeValue });
    }).toThrow("Invalid operation");
  });
});

describe("toDuration", () => {
  test("milliseconds converts to milliseconds", () => {
    expect(toDuration({ milliseconds: 1 })).toEqual(1);
  });
  test("seconds converts to milliseconds", () => {
    expect(toDuration({ seconds: 1 })).toEqual(1000);
  });
  test("minutes converts to milliseconds", () => {
    expect(toDuration({ minutes: 1 })).toEqual(1000 * 60);
  });
  test("hours converts to milliseconds", () => {
    expect(toDuration({ hours: 1 })).toEqual(1000 * 60 * 60);
  });
  test("days converts to milliseconds", () => {
    expect(toDuration({ days: 1 })).toEqual(1000 * 60 * 60 * 24);
  });
});

describe("epoch-arithmetic", () => {
  test.each([
    {
      a: toInstant({ milliseconds: 0 }),
      b: toDuration({ milliseconds: 1 }),
      r: toInstant({ milliseconds: 1 }),
    },
    {
      a: toInstant({ milliseconds: 1 }),
      b: toDuration({ milliseconds: 2 }),
      r: toInstant({ milliseconds: 3 }),
    },
  ])(
    "addDuration",
    (testCase: { a: EpochMilliseconds; b: DurationMilliseconds; r: EpochMilliseconds }) => {
      expect(epochArithmetic.addDuration(testCase.a, testCase.b)).toEqual(testCase.r);
    },
  );

  test.each([
    {
      a: toInstant({ milliseconds: 1 }),
      b: toDuration({ milliseconds: 1 }),
      r: toInstant({ milliseconds: 0 }),
    },
    {
      a: toInstant({ milliseconds: 3 }),
      b: toDuration({ milliseconds: 1 }),
      r: toInstant({ milliseconds: 2 }),
    },
  ])(
    "substractDuration",
    (testCase: { a: EpochMilliseconds; b: DurationMilliseconds; r: EpochMilliseconds }) => {
      expect(epochArithmetic.substractDuration(testCase.a, testCase.b)).toEqual(testCase.r);
    },
  );

  test.each([
    {
      a: toInstant({ milliseconds: 1 }),
      b: toInstant({ milliseconds: 1 }),
      r: toInstant({ milliseconds: 0 }),
    },
    {
      a: toInstant({ milliseconds: 3 }),
      b: toInstant({ milliseconds: 1 }),
      r: toInstant({ milliseconds: 2 }),
    },
  ])(
    "substract",
    (testCase: { a: EpochMilliseconds; b: EpochMilliseconds; r: EpochMilliseconds }) => {
      expect(epochArithmetic.substract(testCase.a, testCase.b)).toEqual(testCase.r);
    },
  );
});
