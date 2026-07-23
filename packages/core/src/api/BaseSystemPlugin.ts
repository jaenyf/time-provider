import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";
import type { ISystemPlugin } from "./ISystemPlugin.ts";

/**
 * Base class for the system-runtime half of a plugin implementation.
 */
export abstract class BaseSystemPlugin<TDate> implements ISystemPlugin<TDate> {
  readonly supportsLocalTime = true as const;

  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IRuntime<TDate>;

  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate> {
    return new this.SystemRuntimeCtor(localTimezone);
  }
}
