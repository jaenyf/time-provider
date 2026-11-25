import type {
  DurationMilliseconds,
  EpochMilliseconds,
  MonotonicMilliseconds,
} from "../types/types.ts";

/** Milliseconds per second. */
export const MILLISECONDS_PER_SECOND = 1_000;
/** Milliseconds per minute. */
export const MILLISECONDS_PER_MINUTE: number = 60 * MILLISECONDS_PER_SECOND;
/** Milliseconds per hour. */
export const MILLISECONDS_PER_HOUR: number = 60 * MILLISECONDS_PER_MINUTE;
/** Milliseconds per day. */
export const MILLISECONDS_PER_DAY: number = 24 * MILLISECONDS_PER_HOUR;

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
  assertNonNegative(spec.milliseconds);
  assertNonNegative(spec.seconds);
  assertNonNegative(spec.minutes);
  assertNonNegative(spec.hours);
  assertNonNegative(spec.days);
}

function assertNonNegative(value: number | undefined): void {
  if (value !== undefined && value < 0) {
    throw new Error("Invalid operation");
  }
}

function msOf(value: number | undefined, unit: number): number {
  return value === undefined ? 0 : value * unit;
}

type TimeSpec = {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
};

function sumMilliseconds(spec: TimeSpec): number {
  return (
    msOf(spec.milliseconds, 1) +
    msOf(spec.seconds, MILLISECONDS_PER_SECOND) +
    msOf(spec.minutes, MILLISECONDS_PER_MINUTE) +
    msOf(spec.hours, MILLISECONDS_PER_HOUR) +
    msOf(spec.days, MILLISECONDS_PER_DAY)
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
