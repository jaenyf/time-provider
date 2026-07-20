import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IUtcOnlyManualRuntime } from "../runtime/IUtcOnlyManualRuntime.ts";
import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";
import type { IUtcOnlyPlugin } from "./IUtcOnlyPlugin.ts";

/**
 * Base class for plugin implementation backed by a timezone-naive date library (no `localNow`).
 */
export abstract class BaseUtcOnlyPlugin<TDate> implements IUtcOnlyPlugin<TDate> {
  readonly supportsLocalTime = false as const;

  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IUtcOnlyRuntime<TDate>;
  protected abstract readonly ManualRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) => IUtcOnlyManualRuntime<TDate>;
  protected abstract readonly FixedRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ) => IUtcOnlyRuntime<TDate>;
  protected abstract readonly SequentialRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
  ) => IUtcOnlyRuntime<TDate>;

  #utcTimezone: TimezoneDefinition = "Etc/UTC";
  createSystemRuntime(): IUtcOnlyRuntime<TDate> {
    return new this.SystemRuntimeCtor(this.#utcTimezone);
  }
  createManualRuntime(initialTime: string | number | TDate): IUtcOnlyManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(this.#utcTimezone, initialTime);
  }
  createFixedRuntime(initialTime: string | number | TDate): IUtcOnlyRuntime<TDate> {
    return new this.FixedRuntimeCtor(this.#utcTimezone, initialTime);
  }
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IUtcOnlyRuntime<TDate> {
    return new this.SequentialRuntimeCtor(this.#utcTimezone, sequentialTimes);
  }
}
