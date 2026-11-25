import type { EpochMilliseconds } from "../../deterministic.ts";
import type { TimezoneDefinition, ITimeConverter } from "../../types/types.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";

/** Base class for deterministic fixed runtimes. */

export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  /**
   * @param localTimezone The runtime timezone.
   * @param fixedTime The fixed clock time.
   * @param converter The runtime time converter.
   */
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | EpochMilliseconds | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [{ time: fixedTime }], converter);
    // Time never advances on a fixed clock, so scheduled callbacks are never due - see ITimers.
    // Microtasks aren't time-driven, so they still run - see runDueCallbacks's own checkpoint.
    this.disableDueDraining();
  }
}
