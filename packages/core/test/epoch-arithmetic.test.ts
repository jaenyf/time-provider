import { describe, expect, test } from "vite-plus/test";
import { asEpoch, epochArithmetic, toDuration, toInstant } from "../src/helpers/branded-types.ts";
import type { EpochMilliseconds, DurationMilliseconds } from "../src/types/types.ts";

const FIELDS = ["milliseconds", "seconds", "minutes", "hours", "days"] as const;

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

  test.each(FIELDS)("throws with a NaN %s", (field) => {
    expect(() => {
      toInstant({ [field]: Number.NaN });
    }).toThrow("Invalid instant value (value was 'NaN')");
  });
  test.each(FIELDS)("throws with an infinite %s", (field) => {
    expect(() => {
      toInstant({ [field]: Number.POSITIVE_INFINITY });
    }).toThrow("Invalid instant value (value was 'Infinity')");
  });
  test("throws when the fields overflow to infinity", () => {
    expect(() => {
      toInstant({ days: Number.MAX_VALUE, hours: Number.MAX_VALUE });
    }).toThrow("Invalid instant value (value was 'Infinity')");
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
  test("keeps a fractional value as given", () => {
    expect(toDuration({ milliseconds: 0.5 })).toEqual(0.5);
  });

  // A non-finite delay reaches a timer and hangs it: a deterministic runtime reads a NaN due
  // time as perpetually due and spins inside advance(), a system runtime chunks an infinite
  // delay into 24.8-day timeouts forever. Reject the value where it is built instead.
  test.each(FIELDS)("throws with a NaN %s", (field) => {
    expect(() => {
      toDuration({ [field]: Number.NaN });
    }).toThrow("Invalid duration value (value was 'NaN')");
  });
  test.each(FIELDS)("throws with an infinite %s", (field) => {
    expect(() => {
      toDuration({ [field]: Number.POSITIVE_INFINITY });
    }).toThrow("Invalid duration value (value was 'Infinity')");
  });
  test.each(FIELDS)("throws with a negatively infinite %s", (field) => {
    expect(() => {
      toDuration({ [field]: Number.NEGATIVE_INFINITY });
    }).toThrow("Invalid duration value (value was '-Infinity')");
  });
  test("throws when the fields overflow to infinity", () => {
    expect(() => {
      toDuration({ days: Number.MAX_VALUE, hours: Number.MAX_VALUE });
    }).toThrow("Invalid duration value (value was 'Infinity')");
  });

  // SECURITY.md says the magnitude of a finite duration is not checked, only its finiteness.
  // These pin that: the line is drawn at Infinity, not at some maximum nobody agreed on.
  test("accepts the largest finite value", () => {
    expect(toDuration({ milliseconds: Number.MAX_VALUE })).toEqual(Number.MAX_VALUE);
  });
  test("accepts an absurd but finite number of days", () => {
    expect(toDuration({ days: 1_000_000 })).toEqual(86_400_000_000_000);
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
    "subtractDuration",
    (testCase: { a: EpochMilliseconds; b: DurationMilliseconds; r: EpochMilliseconds }) => {
      expect(epochArithmetic.subtractDuration(testCase.a, testCase.b)).toEqual(testCase.r);
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
    "subtract",
    (testCase: { a: EpochMilliseconds; b: EpochMilliseconds; r: EpochMilliseconds }) => {
      expect(epochArithmetic.subtract(testCase.a, testCase.b)).toEqual(testCase.r);
    },
  );
});
