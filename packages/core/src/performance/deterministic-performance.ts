import type { BaseDeterministicRuntime } from "../runtimes/deterministic-runtime.ts";
import type {
  IPerformance,
  IPerformanceEntry,
  IPerformanceMark,
  IPerformanceMarkOptions,
  IPerformanceMeasure,
  IPerformanceMeasureOptions,
  PerformanceEntryType,
} from "../types/types.ts";

class PerformanceError extends DOMException {
  /*
   * The native performance API throws DOMException errors
   */
}

/**
 * A deterministic performance class
 */
export class DeterministicPerformance<TDate> implements IPerformance {
  private static uninitializedTimeOrigin = Number.MAX_VALUE;

  #runtime!: BaseDeterministicRuntime<TDate>;
  #timeOrigin: number = DeterministicPerformance.uninitializedTimeOrigin;
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

  private assertAndGetTimeOrigin(): number {
    let timeOrigine = this.#timeOrigin;
    if (timeOrigine != DeterministicPerformance.uninitializedTimeOrigin) {
      return timeOrigine;
    }

    timeOrigine = this.#runtime.peekTimestamp();
    this.#timeOrigin = timeOrigine;
    return timeOrigine;
  }

  now(): number {
    this.assertInitialization();
    return this.#runtime.peekTimestamp() - this.assertAndGetTimeOrigin();
  }

  get timeOrigin(): number {
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
    const entry: IPerformanceMark = {
      name,
      entryType: "mark",
      startTime: options?.startTime ?? this.now(),
      duration: 0,
    };

    this.#entries.push(entry);

    return entry;
  };

  measure = (
    name: string,
    startMarkOrOptions?: string | IPerformanceMeasureOptions,
  ): IPerformanceMeasure => {
    this.assertInitialization();
    let startTime = 0;
    let endTime = this.now();

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
          endTime = startTime + options.duration;
        } else {
          startTime = endTime - options.duration;
        }
      }
    }

    const entry: IPerformanceMeasure = {
      name,
      entryType: "measure",
      startTime,
      duration: endTime - startTime,
    };

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
