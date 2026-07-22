import type { TimezoneDefinition } from "./TimezoneDefinition.ts";

export interface ILocalOnlyClock<TDate> {
  /**
   * Returns the time as of now for the local timezone of the runtime.
   * If no local timezone has been specified when building it, is assumed to be "Etc/UTC" (aka. Greenwhich timezone).
   * Therefor, the runtime will not try to guess the host localtime !
   */
  localNow(): TDate;
  /**
   * Redefine the local timezone of the runtime.
   *
   * @param timezone the new local `timezone` to be used by the runtime.
   */
  withTimezone(timezone: TimezoneDefinition): this;
  /**
   * Retrieves the host timezone.
   * @returns a `TimezoneDefinition` describing the host timezone.
   */
  hostTimezone(): TimezoneDefinition;

  /**
   * Get the current defined local timezone.
   * @returns the current defined local timezone as a `TimezoneDefinition`.
   */
  get timezone(): TimezoneDefinition;
}
