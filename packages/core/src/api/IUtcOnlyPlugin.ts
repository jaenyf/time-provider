import type { IUtcOnlyManualRuntime } from "../runtime/IUtcOnlyManualRuntime.ts";
import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";

/**
 * A plugin whose underlying date library has no timezone-aware date type, so it can only ever expose UTC time.
 */
export interface IUtcOnlyPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   * Also serves as discriminant by `createTimeProvider.for()`.
   */
  readonly supportsLocalTime: false;
  /**
   * Create a runtime for system time and scheduler
   */
  createSystemRuntime(): IUtcOnlyRuntime<TDate>;
  /**
   * Create a runtime for manual time and scheduler
   */
  createManualRuntime(initialTime: string | number | TDate): IUtcOnlyManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(initialTime: string | number | TDate): IUtcOnlyRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler
   */
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IUtcOnlyRuntime<TDate>;
}
