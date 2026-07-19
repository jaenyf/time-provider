import type { IManualRuntime } from "../runtime/IManualRuntime.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";

/**
 * A plugin whose underlying date library has timezone-aware date type, so it can expose both local and UTC time.
 */
export interface IPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   * Also serves as discriminant by `createTimeProvider.for()`.
   */
  readonly supportsLocalTime: true;
  /**
   * Create a runtime for system time and scheduler
   */
  createSystemRuntime(): IRuntime<TDate>;
  /**
   * Create a runtime for manual time and scheduler
   */
  createManualRuntime(initialTime: string | number | TDate): IManualRuntime<TDate>;
  /**
   * Create a runtime for fixed time and scheduler
   */
  createFixedRuntime(initialTime: string | number | TDate): IRuntime<TDate>;
  /**
   * Create a runtime for sequential time and scheduler
   */
  createSequentialRuntime(sequentialTimes: (string | number | TDate)[]): IRuntime<TDate>;
}
