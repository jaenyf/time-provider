import type {
  IRuntime,
  ISystemPlugin,
  IUtcOnlyRuntime,
  IUtcOnlySystemPlugin,
  TimezoneDefinition,
} from "../types/types.ts";

/**
 * Base class for a system (real time) plugin implementation.
 */
export abstract class BaseSystemPlugin<TDate> implements ISystemPlugin<TDate> {
  readonly supportsLocalTime = true as const;

  /**
   * The concrete runtime constructor for this plugin's date library. Subclasses provide this
   * so {@link createSystemRuntime} can instantiate the right runtime.
   */
  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IRuntime<TDate>;

  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate> {
    return new this.SystemRuntimeCtor(localTimezone);
  }
}

/**
 * Base class for a system (real time) plugin implementation backed by a timezone-naive date library.
 */
export abstract class BaseUtcOnlySystemPlugin<TDate> implements IUtcOnlySystemPlugin<TDate> {
  readonly supportsLocalTime = false as const;

  /**
   * The concrete runtime constructor for this plugin's date library. Subclasses provide this
   * so {@link createSystemRuntime} can instantiate the right runtime.
   */
  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IUtcOnlyRuntime<TDate>;

  #utcTimezone: TimezoneDefinition = "Etc/UTC";

  createSystemRuntime(): IUtcOnlyRuntime<TDate> {
    return new this.SystemRuntimeCtor(this.#utcTimezone);
  }
}
