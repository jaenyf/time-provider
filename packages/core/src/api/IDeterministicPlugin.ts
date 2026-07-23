import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IManualRuntime } from "../runtime/IManualRuntime.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";

/**
 * A plugin capable of producing fixed/manual/sequential (deterministic)
 * runtimes, backed by a timezone-aware date library. See `ISystemPlugin` for
 * why this is a separate interface rather than folded into one plugin
 * interface with every runtime kind.
 */
export interface IDeterministicPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   * Also serves as discriminant by `createDeterministicTimeProvider.for()`.
   */
  readonly supportsLocalTime: true;
  /**
   * Create a runtime for manual time and scheduler
   */
  createManualRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ): IManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(
    localTimezone: TimezoneDefinition,
    initialTime: string | number | TDate,
  ): IRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler
   */
  createSequentialRuntime(
    localTimezone: TimezoneDefinition,
    sequentialTimes: (string | number | TDate)[],
  ): IRuntime<TDate>;
}
