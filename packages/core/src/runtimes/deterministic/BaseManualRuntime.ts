import { type EpochMilliseconds, toDuration } from "../../deterministic.ts";
import type {
  IManualRuntime,
  TimezoneDefinition,
  ITimeConverter,
  IManualClock,
  IMoveSpec,
  IMoveOptions,
} from "../../types/types.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";

/** Base class for deterministic manual runtimes. */

export abstract class BaseManualRuntime<TDate>
  extends BaseSequentialRuntime<TDate>
  implements IManualRuntime<TDate>
{
  #moveUntilTimersLimit: number;

  /**
   * @param localTimezone The runtime timezone.
   * @param fixedTime The initial clock time.
   * @param converter The runtime time converter.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | TDate,
    moveUntilTimersLimit: number,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [{ time: fixedTime }], converter);
    this.#moveUntilTimersLimit = moveUntilTimersLimit;
  }

  get moveUntilTimersLimit(): number {
    return this.#moveUntilTimersLimit;
  }

  get clock(): IManualClock<TDate> {
    return this;
  }

  /**
   * Advances the clock by the given fields in {@link IAdvanceOptions} order.
   * @deprecated Use {@link moveBy}
   */
  advance(advanceConfiguration: IMoveSpec): IManualRuntime<TDate> {
    this.assertIsNotDisposed();
    this.flowTo(this.#targetOf(advanceConfiguration));
    return this;
  }

  moveBy(spec: IMoveSpec, options?: IMoveOptions): IManualRuntime<TDate> {
    this.assertIsNotDisposed();
    return this.moveClock(this.#targetOf(spec), options);
  }

  moveTo(
    time: "nextTimer" | "lastTimer" | (string & {}) | EpochMilliseconds | TDate,
    options?: IMoveOptions,
  ): IManualRuntime<TDate> {
    this.assertIsNotDisposed();
    if (time === "nextTimer" || time === "lastTimer") {
      const dueTime = time === "nextTimer" ? this.nextDueTime : this.lastDueTime;
      if (dueTime === undefined) throw new Error("No pending timer to move to");
      return this.moveClock(dueTime, options);
    }
    return this.moveClock(this.convertToEpochTimestampImpl(time), options);
  }

  moveUntil(until: "noTimers", options?: { as?: "flow" | "sleep" }): IManualRuntime<TDate> {
    this.assertIsNotDisposed();
    const as: unknown = options?.as;
    if (until !== "noTimers" || as === "snap") {
      throw new Error(`Invalid moveUntil arguments ('${until}', as: '${String(as)}')`);
    }
    let fired = 0;
    for (let next = this.nextDueTime; next !== undefined; next = this.nextDueTime) {
      fired += this.countTimersDueBy(next);
      if (fired > this.moveUntilTimersLimit) {
        throw new Error(
          `Timers still pending after ${this.moveUntilTimersLimit} fired; see withMoveUntilTimersLimit()`,
        );
      }
      this.moveClock(next, { as: options?.as });
    }
    return this;
  }

  /** Applies `spec` to the current time, in {@link IMoveSpec} field order. */
  #targetOf(spec: IMoveSpec): EpochMilliseconds {
    let timestamp: number = this.timestampNow();
    // Only years and months vary in length on the UTC calendar; the rest is plain arithmetic.
    if (spec.years || spec.months) {
      let time = this.convertToUtcDateImpl(timestamp as EpochMilliseconds);
      if (spec.years) time = this.advanceYears(time, spec.years);
      if (spec.months) time = this.advanceMonths(time, spec.months);
      timestamp = this.convertToEpochTimestampImpl(time);
    }
    return (timestamp + toDuration(spec)) as EpochMilliseconds;
  }

  /** Returns `time` shifted by `years`. */
  protected abstract advanceYears(time: TDate, years: number): TDate;
  /** Returns `time` shifted by `months`. */
  protected abstract advanceMonths(time: TDate, months: number): TDate;
}
