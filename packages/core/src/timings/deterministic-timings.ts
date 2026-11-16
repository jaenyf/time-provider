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
  /** The native performance API throws DOMException errors */
}

/** A mark or measure recorded by {@link DeterministicTimings}. */
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

function applyMeasureDuration(
  options: ITimingMeasureOptions | undefined,
  startTime: MonotonicMilliseconds,
  endTime: MonotonicMilliseconds,
): { startTime: MonotonicMilliseconds; endTime: MonotonicMilliseconds } {
  if (options?.duration === undefined) {
    return { startTime, endTime };
  }

  if (options.start !== undefined) {
    return {
      startTime,
      endTime: monotonicArithmetic.addDuration(startTime, options.duration),
    };
  }

  return {
    startTime: monotonicArithmetic.subtractDuration(endTime, options.duration),
    endTime,
  };
}

function resolveMeasureInterval(
  options: ITimingMeasureOptions | undefined,
  clock: { monotonicNow(): MonotonicMilliseconds },
  resolve: (instantOrMarkName: string | MonotonicMilliseconds) => MonotonicMilliseconds,
): { startTime: MonotonicMilliseconds; endTime: MonotonicMilliseconds } {
  const startTime = options?.start === undefined ? toMonotonic({}) : resolve(options.start);

  const endTime = options?.end === undefined ? clock.monotonicNow() : resolve(options.end);

  return applyMeasureDuration(options, startTime, endTime);
}

/** Deterministic marks and measures on a monotonic clock. */
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

    const { startTime, endTime } = resolveMeasureInterval(
      options,
      this.#clock,
      (instantOrMarkName) => this.#resolve(instantOrMarkName),
    );

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

  /** Resolves an instant or named mark. */
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
