import type {
  IRuntime,
  ISystemPlugin,
  IUtcOnlyRuntime,
  IUtcOnlySystemPlugin,
  TimezoneDefinition,
} from "../types/types.ts";

/** Base system-time plugin. */
export abstract class BaseSystemPlugin<TDate> implements ISystemPlugin<TDate> {
  readonly supportsLocalTime = true as const;

  /** Constructor for the system runtime. */
  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IRuntime<TDate>;

  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate> {
    return new this.SystemRuntimeCtor(localTimezone);
  }
}

/** Base UTC-only system-time plugin. */
export abstract class BaseUtcOnlySystemPlugin<TDate> implements IUtcOnlySystemPlugin<TDate> {
  readonly supportsLocalTime = false as const;

  /** Constructor for the system runtime. */
  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IUtcOnlyRuntime<TDate>;

  #utcTimezone: TimezoneDefinition = "Etc/UTC";

  createSystemRuntime(): IUtcOnlyRuntime<TDate> {
    return new this.SystemRuntimeCtor(this.#utcTimezone);
  }
}
