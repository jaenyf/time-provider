# IClock

```ts
interface ITimestampClock {
  timestampNow(): number;
}

interface IUtcOnlyClock<TDate> extends ITimestampClock {
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> extends ITimestampClock {
  localNow(): TDate;
  withTimezone(timezone: TimezoneDefinition): this;
  hostTimezone(): TimezoneDefinition;
  get timezone(): TimezoneDefinition;
}

interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}
```

`IClock` is exported from `@time-provider/core`. `ITimestampClock`,
`IUtcOnlyClock` and `ILocalOnlyClock` are **not exported** — they are shown here
because they are part of the public API surface, not because you can import
them: they are the shape your `timeProvider.clock` actually has, and which of
their members exists depends on the plugin. You will see these names in editor
tooltips and type errors, which is why they are documented under them. To write
one down, derive it — see [Naming these types](#naming-these-types).

- **`utcNow()`** — the current instant, in UTC, as the plugin's `TDate`.
  Always available. On a sequential clock this read is what consumes the next
  queued instant, and may run due scheduler callbacks as a side effect.
- **`localNow()`** — the current instant, rendered in the clock's
  configured local timezone. Only on timezone-aware plugins (`IClock`, not
  `IUtcOnlyClock`) — see [Timezones & Local Time](/guide/timezones). If no
  timezone was ever configured, assumes `"Etc/UTC"`. Consumes a sequential
  instant just like `utcNow()`.
- **`timestampNow()`** — the current instant as epoch milliseconds, and the
  one read guaranteed to be free of side effects: on a sequential clock it
  neither consumes the next queued instant nor runs due callbacks. Use it
  when "now" is only needed to compute something (a delay, an elapsed
  duration) rather than to observe time passing. Always available, on both
  clock kinds.
- **`withTimezone(tz)`** — reconfigures the local timezone on an
  already-built clock, returning `this` for chaining.
- **`hostTimezone()`** — the IANA timezone of the current host machine,
  regardless of what the clock is configured to.
- **`.timezone`** — the currently configured local timezone (a plain
  `TimezoneDefinition`, i.e. a `string`).

## IManualClock

```ts
interface IManualClock<TDate> extends IClock<TDate>, IAdvanceable<IManualClock<TDate>> {}

interface IUtcOnlyManualClock<TDate>
  extends IUtcOnlyClock<TDate>, IAdvanceable<IUtcOnlyManualClock<TDate>> {}

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

Only on a manual clock (see [Manual Clock](/guide/manual-clock)) —
`IManualClock` from a timezone-aware plugin, `IUtcOnlyManualClock` from a
UTC-only one.

None of these four is exported either. Same reason as above: they describe what
`.asManual()....create()` hands you, so they belong in the reference even though
the names aren't importable. Derive them from the provider type as shown
[below](#naming-these-types).

`advance()` moves the clock's time forward (or backward, with negative
values); when more than one field is set, they apply to the current time in
the fixed order `years → months → days → hours → minutes → seconds →
milliseconds`, since combining calendar-variable fields with others can
otherwise give a different result depending on the order. Any
`setTimeout`/`setInterval` callback that becomes due as a result runs
synchronously, in-line, before `advance()` returns — see
[Deterministic Scheduler](/guide/scheduler).

## Naming these types

You rarely need to. At a build site, let inference do the work — it produces a
narrower type than any annotation you could write, and it carries the extras
composed in by any [addons](/guide/addons), which an annotation drops:

```ts
const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .asManual()
  .withInitialTime(0)
  .create();
// clock.advance(), plus the addon's own facade, both inferred
```

Where you do need a name — a parameter in a shared test helper, or a package
that emits declarations — start from the provider type and index down. Only the
provider types are exported; the clock interfaces above are reached through
them:

```ts
import type { IManualTimeProvider } from "@time-provider/core/deterministic";

type ManualClock = IManualTimeProvider<Date>["clock"]; // IManualClock<Date>
type AdvanceOptions = Parameters<ManualClock["advance"]>[0]; // IAdvanceOptions

function advancePastRetry(clock: ManualClock, options: AdvanceOptions) {
  clock.advance(options);
}
```

Use `IUtcOnlyManualTimeProvider` instead for a UTC-only plugin. To name a
provider that has an addon composed in, intersect with the addon's own exported
shape — e.g. `IManualTimeProvider<Date> & WithCronApi` from
`@time-provider/addon-cron`.
