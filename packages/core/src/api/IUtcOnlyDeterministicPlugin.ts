import type { IUtcOnlyManualRuntime } from "../runtime/IUtcOnlyManualRuntime.ts";
import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";

/**
 * A plugin capable of producing fixed/manual/sequential (deterministic)
 * runtimes, backed by a timezone-naive date library (UTC only).
 */
export interface IUtcOnlyDeterministicPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   * Also serves as discriminant by `createDeterministicTimeProvider.for()`.
   */
  readonly supportsLocalTime: false;
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
