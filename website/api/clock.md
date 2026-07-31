# IClock

```ts
interface IUtcOnlyClock<TDate> {
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> {
  localNow(): TDate;
  withTimezone(timezone: TimezoneDefinition): this;
  hostTimezone(): TimezoneDefinition;
  get timezone(): TimezoneDefinition;
}

interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}
```

- **`utcNow()`** — the current instant, in UTC, as the plugin's `TDate`.
  Always available.
- **`localNow()`** — the current instant, rendered in the clock's
  configured local timezone. Only on timezone-aware plugins (`IClock`, not
  `IUtcOnlyClock`) — see [Timezones & Local Time](/guide/timezones). If no
  timezone was ever configured, assumes `"Etc/UTC"`.
- **`withTimezone(tz)`** — reconfigures the local timezone on an
  already-built clock, returning `this` for chaining.
- **`hostTimezone()`** — the IANA timezone of the current host machine,
  regardless of what the clock is configured to.
- **`.timezone`** — the currently configured local timezone (a plain
  `TimezoneDefinition`, i.e. a `string`).

## IManualClock

```ts
interface IManualClock<TDate> extends IClock<TDate>, IAdvanceable<IManualClock<TDate>> {}

interface IAdvanceOptions {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

interface IAdvanceable<TSelf> {
  advance(advanceOptions: IAdvanceOptions): TSelf;
}
```

Only on a manual clock (see [Manual Clock](/guide/manual-clock)).
`advance()` moves the clock's time forward (or backward, with negative
values); when more than one field is set, they apply to the current time in
the fixed order `years → months → days → hours → minutes → seconds →
milliseconds`, since combining calendar-variable fields with others can
otherwise give a different result depending on the order. Any
`setTimeout`/`setInterval` callback that becomes due as a result runs
synchronously, in-line, before `advance()` returns — see
[Deterministic Scheduler](/guide/scheduler).
