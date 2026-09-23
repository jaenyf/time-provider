import { monotonicArithmetic, toInstant, toMonotonic } from "../helpers/branded-types.ts";
import type { BaseDeterministicRuntime } from "../runtimes/deterministic-runtime.ts";
import type {
  DurationMilliseconds,
  EpochMilliseconds,
  IPerformance,
  IPerformanceEntry,
  IPerformanceMark,
  IPerformanceMarkOptions,
  IPerformanceMeasure,
  IPerformanceMeasureOptions,
  MonotonicMilliseconds,
  PerformanceEntryType,
} from "../types/types.ts";

class PerformanceError extends DOMException {
  /*
   * The native performance API throws DOMException errors
   */
}

/**
 * A mark or a measure recorded by {@link DeterministicPerformance}.
 */
class DeterministicPerformanceEntry<TEntryType extends "mark" | "measure"> {
  readonly name: string;
  readonly entryType: TEntryType;
  readonly startTime: MonotonicMilliseconds;
  readonly duration: DurationMilliseconds;
  readonly detail: unknown;

  constructor(
    name: string,
    entryType: TEntryType,
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
 * A deterministic performance class
 */
export class DeterministicPerformance<TDate> implements IPerformance {
  private static uninitializedTimeOrigin: EpochMilliseconds = toInstant({
    milliseconds: Number.MAX_VALUE,
  });

  #runtime!: BaseDeterministicRuntime<TDate>;
  #timeOrigin: EpochMilliseconds = DeterministicPerformance.uninitializedTimeOrigin;
  #entries: IPerformanceEntry[] = [];
  #initialized: boolean = false;

  initialize(runtime: BaseDeterministicRuntime<TDate>) {
    /**
     * Note: clock.timestampNow() may not be available at this point
     */
    this.#runtime = runtime;
    this.#initialized = true;
  }

  private assertInitialization(): void {
    if (!this.#initialized) {
      throw new PerformanceError("Deterministic performance has not been initialized");
    }
  }

  private assertAndGetTimeOrigin(): EpochMilliseconds {
    let timeOrigin = this.#timeOrigin;
    if (timeOrigin != DeterministicPerformance.uninitializedTimeOrigin) {
      return timeOrigin;
    }

    timeOrigin = this.#runtime.timestampNow();
    this.#timeOrigin = timeOrigin;
    return timeOrigin;
  }

  now(): MonotonicMilliseconds {
    this.assertInitialization();
    return (this.#runtime.timestampNow() - this.assertAndGetTimeOrigin()) as MonotonicMilliseconds;
  }

  get timeOrigin(): EpochMilliseconds {
    this.assertInitialization();
    return this.assertAndGetTimeOrigin();
  }

  getEntries = (): readonly IPerformanceEntry[] => {
    return [...this.#entries];
  };

  getEntriesByName = (
    name: string,
    entryType?: PerformanceEntryType,
  ): readonly IPerformanceEntry[] => {
    return this.#entries.filter(
      (entry) => entry.name === name && (!entryType || entry.entryType === entryType),
    );
  };

  getEntriesByType = (entryType: PerformanceEntryType): readonly IPerformanceEntry[] => {
    return this.#entries.filter((entry) => entry.entryType === entryType);
  };

  mark = (name: string, options?: IPerformanceMarkOptions): IPerformanceMark => {
    const entry: IPerformanceMark = new DeterministicPerformanceEntry(
      name,
      "mark",
      options?.startTime ?? this.now(),
      0 as DurationMilliseconds,
      options?.detail,
    );

    this.#entries.push(entry);

    return entry;
  };

  measure = (
    name: string,
    startMarkOrOptions?: string | IPerformanceMeasureOptions,
  ): IPerformanceMeasure => {
    this.assertInitialization();
    let startTime: MonotonicMilliseconds = toMonotonic({});
    let endTime: MonotonicMilliseconds = this.now();

    if (typeof startMarkOrOptions === "string") {
      const startMark = this.#findMark(startMarkOrOptions);

      if (!startMark) {
        throw new PerformanceError(`The performance mark '${startMarkOrOptions}' does not exist.`);
      }

      startTime = startMark.startTime;
    } else if (startMarkOrOptions) {
      const options = startMarkOrOptions;

      if (
        options.start !== undefined &&
        options.end !== undefined &&
        options.duration !== undefined
      ) {
        throw new TypeError("The performance measure options are over-determined");
      }

      if (options.start === undefined && options.end === undefined) {
        throw new TypeError("The performance measure options are under-determined");
      }

      if (options.start !== undefined) {
        if (typeof options.start === "number") {
          startTime = options.start;
        } else {
          const startMark = this.#findMark(String(options.start));

          if (!startMark) {
            throw new PerformanceError(
              `The performance mark '${String(options.start)}' does not exist.`,
            );
          }
          startTime = startMark.startTime;
        }
      }

      if (options.end !== undefined) {
        if (typeof options.end === "number") {
          endTime = options.end;
        } else {
          const endMark = this.#findMark(String(options.end));

          if (!endMark) {
            throw new PerformanceError(
              `The performance mark '${String(options.end)}' does not exist.`,
            );
          }
          endTime = endMark.startTime;
        }
      }

      if (options.duration !== undefined) {
        if (options.start !== undefined) {
          endTime = monotonicArithmetic.addDuration(startTime, options.duration);
        } else {
          startTime = monotonicArithmetic.subtractDuration(endTime, options.duration);
        }
      }
    }

    const entry: IPerformanceMeasure = new DeterministicPerformanceEntry(
      name,
      "measure",
      startTime,
      monotonicArithmetic.subtract(endTime, startTime),
      typeof startMarkOrOptions === "string" ? undefined : startMarkOrOptions?.detail,
    );

    this.#entries.push(entry);

    return entry;
  };

  clearMarks = (name?: string): void => {
    this.#entries = this.#entries.filter(
      (entry) => entry.entryType !== "mark" || (name !== undefined && entry.name !== name),
    );
  };

  clearMeasures = (name?: string): void => {
    this.#entries = this.#entries.filter(
      (entry) => entry.entryType !== "measure" || (name !== undefined && entry.name !== name),
    );
  };

  #findMark(name: string): IPerformanceMark | undefined {
    return this.#entries.find(
      (entry): entry is IPerformanceMark => entry.entryType === "mark" && entry.name === name,
    );
  }
}
