import type {
  EpochMilliseconds,
  IDeterministicPlugin,
  IDeterministicRuntime,
  IManualRuntime,
  IUtcOnlyDeterministicPlugin,
  IUtcOnlyDeterministicRuntime,
  IUtcOnlyManualRuntime,
  TimezoneDefinition,
} from "../types/types.ts";

/** Base deterministic plugin. */
export abstract class BaseDeterministicPlugin<TDate> implements IDeterministicPlugin<TDate> {
  readonly supportsLocalTime = true as const;

  /** Constructor for the manual runtime. */
  protected abstract readonly ManualRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IManualRuntime<TDate>;

  /** Constructor for the fixed runtime. */
  protected abstract readonly FixedRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IDeterministicRuntime<TDate>;

  /** Constructor for the sequential runtime. */
  protected abstract readonly SequentialRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ) => IDeterministicRuntime<TDate>;

  createManualRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(localTimezone, initialTime);
  }

  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IDeterministicRuntime<TDate> {
    return new this.FixedRuntimeCtor(localTimezone, initialTime);
  }

  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IDeterministicRuntime<TDate> {
    return new this.SequentialRuntimeCtor(localTimezone, sequentialTimes);
  }
}

/** Base deterministic plugin for UTC-only date libraries. */
export abstract class BaseUtcOnlyDeterministicPlugin<
  TDate,
> implements IUtcOnlyDeterministicPlugin<TDate> {
  readonly supportsLocalTime = false as const;

  /** Constructor for the manual runtime. */
  protected abstract readonly ManualRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IUtcOnlyManualRuntime<TDate>;

  /** Constructor for the fixed runtime. */
  protected abstract readonly FixedRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    initialTime: string | EpochMilliseconds | number | TDate,
  ) => IUtcOnlyDeterministicRuntime<TDate>;

  /** Constructor for the sequential runtime. */
  protected abstract readonly SequentialRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ) => IUtcOnlyDeterministicRuntime<TDate>;

  #utcTimezone: TimezoneDefinition = "Etc/UTC";

  createManualRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyManualRuntime<TDate> {
    return new this.ManualRuntimeCtor(this.#utcTimezone, initialTime);
  }

  createFixedRuntime(
    initialTime: string | EpochMilliseconds | number | TDate,
  ): IUtcOnlyDeterministicRuntime<TDate> {
    return new this.FixedRuntimeCtor(this.#utcTimezone, initialTime);
  }

  createSequentialRuntime(
    sequentialTimes: (string | EpochMilliseconds | number | TDate)[],
  ): IUtcOnlyDeterministicRuntime<TDate> {
    return new this.SequentialRuntimeCtor(this.#utcTimezone, sequentialTimes);
  }
}
