import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import { BaseSequentialRuntime } from "./BaseSequentialRuntime.ts";

/**
 * Base class for a deterministically fixed runtime
 */
export abstract class BaseFixedRuntime<TDate> extends BaseSequentialRuntime<TDate> {
  constructor(localTimezone: TimezoneDefinition, fixedTime: string | number | TDate) {
    super(localTimezone, [fixedTime]);
  }

  protected override mayRunTimeoutCallbacks(_nowTimestamp: number): void {
    /* time is frozen */
  }
  protected override mayRunIntervalCallbacks(_nowTimestamp: number): void {
    /* time is frozen */
  }
}
