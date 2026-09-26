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
  let ms: number = 0;

  if (durationSpec.milliseconds !== undefined) {
    ms += durationSpec.milliseconds;
  }

  if (durationSpec.seconds !== undefined) {
    ms += durationSpec.seconds * MILLISECONDS_PER_SECOND;
  }

  if (durationSpec.minutes !== undefined) {
    ms += durationSpec.minutes * MILLISECONDS_PER_MINUTE;
  }

  if (durationSpec.hours !== undefined) {
    ms += durationSpec.hours * MILLISECONDS_PER_HOUR;
  }

  if (durationSpec.days !== undefined) {
    ms += durationSpec.days * MILLISECONDS_PER_DAY;
  }

  // `NaN` and `Infinity` are not rejected by the branded type, which is a compile-time construct,
  // and every runtime mishandles them differently once they reach a timer: a deterministic one
  // treats a `NaN` delay as perpetually due and spins forever, a system one chunks an infinite
  // delay into 24.8-day timeouts that never end. Reject them here, where the value is built.
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
  let ms: number = 0;

  if (instantSpec.milliseconds !== undefined) {
    if (instantSpec.milliseconds < 0) {
      throw new Error("Invalid operation");
    }
    ms += instantSpec.milliseconds;
  }

  if (instantSpec.seconds !== undefined) {
    if (instantSpec.seconds < 0) {
      throw new Error("Invalid operation");
    }
    ms += instantSpec.seconds * MILLISECONDS_PER_SECOND;
  }

  if (instantSpec.minutes !== undefined) {
    if (instantSpec.minutes < 0) {
      throw new Error("Invalid operation");
    }
    ms += instantSpec.minutes * MILLISECONDS_PER_MINUTE;
  }

  if (instantSpec.hours !== undefined) {
    if (instantSpec.hours < 0) {
      throw new Error("Invalid operation");
    }
    ms += instantSpec.hours * MILLISECONDS_PER_HOUR;
  }

  if (instantSpec.days !== undefined) {
    if (instantSpec.days < 0) {
      throw new Error("Invalid operation");
    }
    ms += instantSpec.days * MILLISECONDS_PER_DAY;
  }

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
