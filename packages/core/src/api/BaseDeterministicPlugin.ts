import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IManualRuntime } from "../runtime/IManualRuntime.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";
import type { IDeterministicPlugin } from "./IDeterministicPlugin.ts";

/**
 * Base class for the fixed/manual/sequential half of a plugin implementation.
 */
export abstract class BaseDeterministicPlugin<TDate> implements IDeterministicPlugin<TDate> {
  readonly supportsLocalTime = true as const;

  protected abstract readonly ManualRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) => IManualRuntime<TDate>;
  protected abstract readonly FixedRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) => IRuntime<TDate>;
  protected abstract readonly SequentialRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
  ) => IRuntime<TDate>;

  createManualRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ): IManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(localTimezone, initialTime);
  }
  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ): IRuntime<TDate> {
    return new this.FixedRuntimeCtor(localTimezone, initialTime);
  }
  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
  ): IRuntime<TDate> {
    return new this.SequentialRuntimeCtor(localTimezone, sequentialTimes);
  }
}
