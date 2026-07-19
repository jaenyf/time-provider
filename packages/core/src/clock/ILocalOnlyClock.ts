import type { TimezoneDefinition } from "./TimezoneDefinition.ts";

export interface ILocalOnlyClock<TDate> {
  /**
   * Returns the time as of now for the local timezone of the runtime.
   * If no local timezone has been specified when building it, is assumed to be "Etc/UTC" (aka. Greenwhich timezone).
   * Therefor, the runtime will not try to guess the host localtime !
   * @param timezone when supplied, returns the time as of now for the given `timezone`, bypassing the runtime local timezone.
   */
  localNow(timezone?: TimezoneDefinition): TDate;
}
