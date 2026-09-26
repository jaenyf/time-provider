import type {
  DurationMilliseconds,
  EpochMilliseconds,
  MonotonicMilliseconds,
} from "../types/types.ts";

/** Number of milliseconds in a second. */
export const MILLISECONDS_PER_SECOND = 1_000;
/** Number of milliseconds in a minute. */
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
/** Number of milliseconds in an hour. */
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
/** Number of milliseconds in a day. */
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

/**
 * Guards a spec total against `NaN` and `±Infinity`, which the `number` fields of a spec accept
 * and the branded return types cannot reject.
 * @throws if `milliseconds` is not a finite number.
 */
function assertFiniteMilliseconds(milliseconds: number, kind: "duration" | "instant"): void {
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`Invalid ${kind} value (value was '${String(milliseconds)}')`);
  }
}

/**
 * Describe a duration in terms of its number of days, hours, minutes, seconds and milliseconds.
 */
export interface IDurationSpec {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

/**
 * Convert a duration spec to a branded duration expressed in milliseconds.
 *
 * A fractional value is kept as given rather than rounded - a deterministic runtime honours it
 * exactly, while a system runtime hands it to the host timer, which truncates it.
 * @param durationSpec the spec describing the duration.
 * @returns a branded DurationMilliseconds type
 * @throws if the fields don't add up to a finite number of milliseconds.
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
 * @returns the shortest possible duration as a IDurationSpec type.
 */
export function asap(): IDurationSpec {
  return { milliseconds: 0 };
}

/**
 * The shortest possible duration.
 * @returns a zero branded DurationMilliseconds.
 */
export function asapMilliseconds(): DurationMilliseconds {
  return 0 as DurationMilliseconds;
}

/**
 * Describe an instant compared to the epoch time in terms of its number of days, hours, minutes, seconds and milliseconds.
 */
export interface IEpochInstantSpec {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

/**
 * Convert the given instant spec to a branded instant expressed as the number of milliseconds since epoch.
 * @param instantSpec the spec describing the instant compared to the epoch time.
 * @returns a branded EpochMilliseconds type
 * @throws if any field is negative, or if the fields don't add up to a finite number of milliseconds.
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
 * @returns the epoch time as a IEpochInstantSpec type.
 */
export function asEpoch(): IEpochInstantSpec {
  return { milliseconds: 0 };
}

/**
 * The epoch time.
 * @returns a zero branded EpochMilliseconds.
 */
export function asEpochMilliseconds(): EpochMilliseconds {
  return 0 as EpochMilliseconds;
}

/**
 * Arithmetic between epoch instants and durations that keeps the branded types.
 */
export const epochArithmetic = {
  addDuration: (a: EpochMilliseconds, b: DurationMilliseconds) => (a + b) as EpochMilliseconds,
  subtract: (a: EpochMilliseconds, b: EpochMilliseconds) => (a - b) as DurationMilliseconds,
  subtractDuration: (a: EpochMilliseconds, b: DurationMilliseconds) => (a - b) as EpochMilliseconds,
};

/**
 * Convert the given spec to a branded point on a monotonic timeline, expressed as the number of
 * milliseconds since that timeline's origin.
 * @param instantSpec the spec describing the point compared to the timeline's origin.
 * @returns a branded MonotonicMilliseconds type
 * @throws if any field is negative, or if the fields don't add up to a finite number of milliseconds.
 */
export function toMonotonic(instantSpec: IEpochInstantSpec): MonotonicMilliseconds {
  return toInstant(instantSpec) as number as MonotonicMilliseconds;
}

/**
 * Arithmetic between monotonic instants and durations that keeps the branded types.
 */
export const monotonicArithmetic = {
  addDuration: (a: MonotonicMilliseconds, b: DurationMilliseconds) =>
    (a + b) as MonotonicMilliseconds,
  subtract: (a: MonotonicMilliseconds, b: MonotonicMilliseconds) => (a - b) as DurationMilliseconds,
  subtractDuration: (a: MonotonicMilliseconds, b: DurationMilliseconds) =>
    (a - b) as MonotonicMilliseconds,
};
