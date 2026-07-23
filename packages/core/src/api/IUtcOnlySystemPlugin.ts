import type { IUtcOnlyRuntime } from "../runtime/IUtcOnlyRuntime.ts";

/**
 * A plugin capable of producing a system (real time) runtime, backed by a
 * timezone-naive date library (UTC only). See `ISystemPlugin` for why this
 * is kept separate from the deterministic interface.
 */
export interface IUtcOnlySystemPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   * Also serves as discriminant by `createTimeProvider.for()`.
   */
  readonly supportsLocalTime: false;
  /**
   * Create a runtime for system time and scheduler
   */
  createSystemRuntime(): IUtcOnlyRuntime<TDate>;
}
