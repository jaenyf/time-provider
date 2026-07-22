/**
 * Ambient declaration for the subset of the TC39 Temporal proposal this plugin uses.
 * (until it is widely and natively available)
 */
declare namespace Temporal {
  interface Instant {
    toZonedDateTimeISO(timeZone: string): ZonedDateTime;
  }

  const Instant: {
    fromEpochMilliseconds(epochMilliseconds: number): Instant;
    from(item: string | Instant): Instant;
  };

  interface ZonedDateTime {
    readonly epochMilliseconds: number;
    toInstant(): Instant;
    withTimeZone(timeZone: string): ZonedDateTime;
    add(duration: {
      years?: number;
      months?: number;
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
      milliseconds?: number;
    }): ZonedDateTime;
  }

  const Now: {
    zonedDateTimeISO(timeZone?: string): ZonedDateTime;
  };
}
