import type {
  IDeterministicPlugin,
  IManualRuntime,
  IRuntime,
  IUtcOnlyDeterministicPlugin,
  IUtcOnlyManualRuntime,
  IUtcOnlyRuntime,
  TimezoneDefinition,
} from "../types/types.ts";

/**
 * Base class for a deterministic plugin implementation.
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

/**
 * Base class for a deterministic plugin implementation backed by a timezone-naive date library.
 */
export abstract class BaseUtcOnlyDeterministicPlugin<
  TDate,
> implements IUtcOnlyDeterministicPlugin<TDate> {
  readonly supportsLocalTime = false as const;

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
