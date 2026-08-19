import type { DurationMilliseconds, EpochMilliseconds } from "../types/types.ts";

export const MILLISECONDS_PER_SECOND = 1_000;
export const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
export const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
export const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;

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
 * @param millisecondsDuration the duration in milliseconds.
 * @returns a branded DurationMilliseconds type
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

  return ms as DurationMilliseconds;
}

/**
 * The shortest possible duration.
 * @returns the shortest possible duration as a IDurationSpec type.
 */
export function asap(): IDurationSpec {
  return { milliseconds: 0 };
}

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

  return ms as EpochMilliseconds;
}

/**
 * Get the epoch time as a branded EpochMilliseconds type.
 * @returns epoch time as a IEpochInstantSpec type
 */
export function asEpoch(): IEpochInstantSpec {
  return { milliseconds: 0 };
}

export function asEpochMilliseconds(): EpochMilliseconds {
  return 0 as EpochMilliseconds;
}

export const epochArithmetic = {
  addDuration: (a: EpochMilliseconds, b: DurationMilliseconds) => (a + b) as EpochMilliseconds,
  substract: (a: EpochMilliseconds, b: EpochMilliseconds) => (a - b) as DurationMilliseconds,
  substractDuration: (a: EpochMilliseconds, b: DurationMilliseconds) =>
    (a - b) as EpochMilliseconds,
};
