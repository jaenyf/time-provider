import type { TimezoneDefinition } from "../clock/TimezoneDefinition.ts";
import type { IRuntime } from "../runtime/IRuntime.ts";

/**
 * A plugin capable of producing a system (real time) runtime, backed by a
 * timezone-aware date library.
 *
 * Deliberately separate from `IDeterministicPlugin`: a consumer who only
 * imports a plugin's system-capable export never holds a static reference
 * to anything reachable only through the deterministic interface, which is
 * what lets a bundler tree-shake fixed/manual/sequential runtime code out of
 * a production build. See ARCHITECTURE.md.
 */
export interface ISystemPlugin<TDate> {
  /**
   * Whether or not this plugin supports timezones and local time.
   * Also serves as discriminant by `createTimeProvider.for()`.
   */
  readonly supportsLocalTime: true;
  /**
   * Create a runtime for system time and scheduler
   */
  createSystemRuntime(localTimezone: TimezoneDefinition): IRuntime<TDate>;
}
