import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IManualRuntime } from "../runtime/IManualRuntime.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";
import type { IPlugin } from "./IPlugin.ts";

/**
 * Base class for plugin implementation
 */
export abstract class BasePlugin<TDate> implements IPlugin<TDate> {
  readonly supportsLocalTime = true as const;

  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IRuntime<TDate>;
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

  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate> {
    return new this.SystemRuntimeCtor(localTimezone);
  }
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
