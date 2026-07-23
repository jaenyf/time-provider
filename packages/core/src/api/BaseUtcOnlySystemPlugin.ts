import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";
import type { IUtcOnlySystemPlugin } from "./IUtcOnlySystemPlugin.ts";

/**
 * Base class for the system-runtime half of a plugin implementation backed
 * by a timezone-naive date library (no `localNow`).
 */
export abstract class BaseUtcOnlySystemPlugin<TDate> implements IUtcOnlySystemPlugin<TDate> {
  readonly supportsLocalTime = false as const;

  protected abstract readonly SystemRuntimeCtor: new (
    localTimezone: TimezoneDefinition,
  ) => IUtcOnlyRuntime<TDate>;

  #utcTimezone: TimezoneDefinition = "Etc/UTC";

  createSystemRuntime(): IUtcOnlyRuntime<TDate> {
    return new this.SystemRuntimeCtor(this.#utcTimezone);
  }
}
