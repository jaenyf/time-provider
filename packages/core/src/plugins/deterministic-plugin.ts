import type {
  EpochMilliseconds,
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

  /**
   * The concrete manual runtime constructor for this plugin's date library. Subclasses provide
   * this so {@link createManualRuntime} can instantiate the right runtime.
   */
  protected abstract readonly ManualRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IManualRuntime<TDate>;
  /**
   * The concrete fixed runtime constructor for this plugin's date library. Subclasses provide
   * this so {@link createFixedRuntime} can instantiate the right runtime.
   */
  protected abstract readonly FixedRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IRuntime<TDate>;
  /**
   * The concrete sequential runtime constructor for this plugin's date library. Subclasses
   * provide this so {@link createSequentialRuntime} can instantiate the right runtime.
   */
  protected abstract readonly SequentialRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ) => IRuntime<TDate>;

  createManualRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(localTimezone, initialTime);
  }
  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IRuntime<TDate> {
    return new this.FixedRuntimeCtor(localTimezone, initialTime);
  }
  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
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

  /**
   * The concrete manual runtime constructor for this plugin's date library. Subclasses provide
   * this so {@link createManualRuntime} can instantiate the right runtime.
   */
  protected abstract readonly ManualRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IUtcOnlyManualRuntime<TDate>;
  /**
   * The concrete fixed runtime constructor for this plugin's date library. Subclasses provide
   * this so {@link createFixedRuntime} can instantiate the right runtime.
   */
  protected abstract readonly FixedRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IUtcOnlyRuntime<TDate>;
  /**
   * The concrete sequential runtime constructor for this plugin's date library. Subclasses
   * provide this so {@link createSequentialRuntime} can instantiate the right runtime.
   */
  protected abstract readonly SequentialRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ) => IUtcOnlyRuntime<TDate>;

  #utcTimezone: TimezoneDefinition = "Etc/UTC";

  createManualRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(this.#utcTimezone, initialTime);
  }
  createFixedRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyRuntime<TDate> {
    return new this.FixedRuntimeCtor(this.#utcTimezone, initialTime);
  }
  createSequentialRuntime(
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IUtcOnlyRuntime<TDate> {
    return new this.SequentialRuntimeCtor(this.#utcTimezone, sequentialTimes);
  }
}
