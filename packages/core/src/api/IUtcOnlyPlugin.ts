import type { IUtcOnlyManualRuntime } from "../runtime/IUtcOnlyManualRuntime.ts";
import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";

/**
 * A plugin whose underlying date library has no timezone-aware date type, so it can only ever
 * expose UTC time - no `localNow`. `plugin-native` (backed by the native, timezone-naive `Date`)
 * implements this instead of `IPlugin`.
 */
export interface IUtcOnlyPlugin<TDate> {
  /**
   * Discriminates an `IUtcOnlyPlugin` from a full (timezone-aware) `IPlugin`, so
   * `createTimeProvider.for()` can pick the right overload for a given plugin.
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
