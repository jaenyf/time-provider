import type {
  DurationMilliseconds,
  EpochMilliseconds,
  MonotonicMilliseconds,
} from "../types/types.ts";

/** Milliseconds per second. */
export const MILLISECONDS_PER_SECOND = 1_000;
/** Milliseconds per minute. */
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
/** Milliseconds per hour. */
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
/** Milliseconds per day. */
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

/**
 * Validates a millisecond total.
 * @throws If `milliseconds` is not finite.
 */
function assertFiniteMilliseconds(milliseconds: number, kind: "duration" | "instant"): void {
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid ${kind} value (value was '${String(milliseconds)}')`);
  }
}

/**
 * Validates a non-negative instant component.
 * @throws If `milliseconds` is negative.
 */
function assertNonNegativeInstant(spec: IEpochInstantSpec): void {
  const values = [spec.milliseconds, spec.seconds, spec.minutes, spec.hours, spec.days];

  for (const value of values) {
    if (value !== undefined && value < 0) {
      throw new Error("Invalid operation");
    }
  }
}

type TimeSpec = {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
};

function sumMilliseconds(spec: TimeSpec): number {
  const multipliers = [
    1,
    MILLISECONDS_PER_SECOND,
    MILLISECONDS_PER_MINUTE,
    MILLISECONDS_PER_HOUR,
    MILLISECONDS_PER_DAY,
  ];

  const values = [spec.milliseconds, spec.seconds, spec.minutes, spec.hours, spec.days];

  return values.reduce<number>(
    (total, value, index) => total + (value ?? 0) * multipliers[index],
    0,
  );
}

/** Describes a duration in days, hours, minutes, seconds and milliseconds. */
export interface IDurationSpec {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

/**
 * Converts a duration spec to branded milliseconds.
 * @param durationSpec The duration spec.
 * @returns A branded `DurationMilliseconds`.
 * @throws If the fields do not produce finite milliseconds.
 */
export function toDuration(durationSpec: IDurationSpec): DurationMilliseconds {
  const ms = sumMilliseconds(durationSpec);

  assertFiniteMilliseconds(ms, "duration");

  return ms as DurationMilliseconds;
}

/**
 * The shortest possible duration.
 * @returns An `IDurationSpec` for zero.
 */
export function asap(): IDurationSpec {
  return { milliseconds: 0 };
}

/**
 * The shortest possible duration.
 * @returns Zero as `DurationMilliseconds`.
 */
export function asapMilliseconds(): DurationMilliseconds {
  return 0 as DurationMilliseconds;
}

/** Describes an epoch instant in days, hours, minutes, seconds and milliseconds. */
export interface IEpochInstantSpec {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

/**
 * Converts an instant spec to epoch milliseconds.
 * @param instantSpec The epoch instant spec.
 * @returns A branded `EpochMilliseconds`.
 * @throws If a field is negative or the total is not finite.
 */
export function toInstant(instantSpec: IEpochInstantSpec): EpochMilliseconds {
  assertNonNegativeInstant(instantSpec);

  const ms = sumMilliseconds(instantSpec);

  assertFiniteMilliseconds(ms, "instant");

  return ms as EpochMilliseconds;
}

/**
 * The epoch time.
 * @returns An `IEpochInstantSpec` for zero.
 */
export function asEpoch(): IEpochInstantSpec {
  return { milliseconds: 0 };
}

/**
 * The epoch time.
 * @returns Zero as `EpochMilliseconds`.
 */
export function asEpochMilliseconds(): EpochMilliseconds {
  return 0 as EpochMilliseconds;
}

/** Arithmetic for epoch instants and durations. */
export const epochArithmetic = {
  addDuration: (a: EpochMilliseconds, b: DurationMilliseconds) => (a + b) as EpochMilliseconds,
  subtract: (a: EpochMilliseconds, b: EpochMilliseconds) => (a - b) as DurationMilliseconds,
  subtractDuration: (a: EpochMilliseconds, b: DurationMilliseconds) => (a - b) as EpochMilliseconds,
};

/**
 * Converts a spec to branded monotonic milliseconds.
 * @param instantSpec The timeline instant spec.
 * @returns A branded `MonotonicMilliseconds`.
 * @throws If a field is negative or the total is not finite.
 */
export function toMonotonic(instantSpec: IEpochInstantSpec): MonotonicMilliseconds {
  return toInstant(instantSpec) as number as MonotonicMilliseconds;
}

/** Arithmetic for monotonic instants and durations. */
export const monotonicArithmetic = {
  addDuration: (a: MonotonicMilliseconds, b: DurationMilliseconds) =>
    (a + b) as MonotonicMilliseconds,
  subtract: (a: MonotonicMilliseconds, b: MonotonicMilliseconds) => (a - b) as DurationMilliseconds,
  subtractDuration: (a: MonotonicMilliseconds, b: DurationMilliseconds) =>
    (a - b) as MonotonicMilliseconds,
};
