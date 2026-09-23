import { monotonicArithmetic, toMonotonic } from "../helpers/branded-types.ts";
import { assertMeasureOptions, matchesTimingsFilter } from "./timings-helpers.ts";
import type {
  DurationMilliseconds,
  ITimingEntry,
  ITimingMark,
  ITimingMarkOptions,
  ITimingMeasure,
  ITimingMeasureOptions,
  ITimings,
  ITimingsFilter,
  MonotonicMilliseconds,
  TimingKind,
} from "../types/types.ts";

class TimingError extends DOMException {
  /*
   * The native performance API throws DOMException errors
   */
}

/**
 * A mark or a measure recorded by {@link DeterministicTimings}.
 */
class DeterministicTimingEntry<TKind extends TimingKind> {
  readonly name: string;
  readonly entryType: TKind;
  readonly startTime: MonotonicMilliseconds;
  readonly duration: DurationMilliseconds;
  readonly detail: unknown;

  constructor(
    name: string,
    entryType: TKind,
    startTime: MonotonicMilliseconds,
    duration: DurationMilliseconds,
    detail: unknown,
  ) {
    this.name = name;
    this.entryType = entryType;
    this.startTime = startTime;
    this.duration = duration;
    this.detail = detail ?? null;
  }

  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail,
    };
  }
}

/**
 * Deterministic marks and measures, recorded on a deterministic runtime's monotonic clock.
 */
export class DeterministicTimings implements ITimings {
  #clock: { monotonicNow(): MonotonicMilliseconds };
  #entries: ITimingEntry[] = [];

  constructor(clock: { monotonicNow(): MonotonicMilliseconds }) {
    this.#clock = clock;
  }

  entries = (filter?: ITimingsFilter): readonly ITimingEntry[] => {
    return this.#entries.filter((entry) => matchesTimingsFilter(entry, filter));
  };

  clear = (filter?: ITimingsFilter): void => {
    this.#entries = this.#entries.filter((entry) => !matchesTimingsFilter(entry, filter));
  };

  mark = (name: string, options?: ITimingMarkOptions): ITimingMark => {
    const entry = new DeterministicTimingEntry(
      name,
      "mark",
      options?.startTime ?? this.#clock.monotonicNow(),
      0 as DurationMilliseconds,
      options?.detail,
    );

    this.#entries.push(entry);

    return entry;
  };

  measure = (name: string, options?: ITimingMeasureOptions): ITimingMeasure => {
    assertMeasureOptions(options);

    let startTime: MonotonicMilliseconds = toMonotonic({});
    let endTime: MonotonicMilliseconds = this.#clock.monotonicNow();

    if (options) {
      if (options.start !== undefined) {
        startTime = this.#resolve(options.start);
      }

      if (options.end !== undefined) {
        endTime = this.#resolve(options.end);
      }

      if (options.duration !== undefined) {
        if (options.start !== undefined) {
          endTime = monotonicArithmetic.addDuration(startTime, options.duration);
        } else {
          startTime = monotonicArithmetic.subtractDuration(endTime, options.duration);
        }
      }
    }

    const entry = new DeterministicTimingEntry(
      name,
      "measure",
      startTime,
      monotonicArithmetic.subtract(endTime, startTime),
      options?.detail,
    );

    this.#entries.push(entry);

    return entry;
  };

  /**
   * An instant as given, or the instant of the named mark.
   */
  #resolve(instantOrMarkName: string | MonotonicMilliseconds): MonotonicMilliseconds {
    if (typeof instantOrMarkName === "number") {
      return instantOrMarkName;
    }
    const mark = this.#entries.find(
      (entry) => entry.entryType === "mark" && entry.name === instantOrMarkName,
    );
    if (!mark) {
      throw new TimingError(`The mark '${instantOrMarkName}' does not exist.`);
    }
    return mark.startTime;
  }
}
