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
  withLocalTimezone(timezone: TimezoneDefinition): this;
}
