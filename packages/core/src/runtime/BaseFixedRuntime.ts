import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { ITimeConverter } from "./ITimeConverter.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";

/**
 * Base class for a deterministically fixed runtime
 */
export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  constructor(
    localTimezone: TimezoneDefinition,
    fixedTime: string | number | TDate,
    converter: ITimeConverter<TDate>,
  ) {
    super(localTimezone, [fixedTime], converter);
  }

  protected override mayRunTimeoutCallbacks(_nowTimestamp: number): void {
    /* time is frozen */
  }
  protected override mayRunIntervalCallbacks(_nowTimestamp: number): void {
    /* time is frozen */
  }
}
