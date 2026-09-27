# IClock

```ts
type EpochMilliseconds = Brand<number, "EpochMilliseconds">;
type MonotonicMilliseconds = Brand<number, "MonotonicMilliseconds">; // a point since monotonicOrigin

interface ITimestampClock {
  timestampNow(): EpochMilliseconds;
}

interface IMonotonicClock {
  monotonicNow(): MonotonicMilliseconds;
  readonly monotonicOrigin: EpochMilliseconds;
}

interface IUtcOnlyClock<TDate> extends ITimestampClock, IMonotonicClock {
  utcNow(): TDate;
}

interface ILocalOnlyClock<TDate> extends ITimestampClock, IMonotonicClock {
  localNow(): TDate;
  withTimezone(timezone: TimezoneDefinition): this;
  hostTimezone(): TimezoneDefinition;
  get timezone(): TimezoneDefinition;
}

interface IClock<TDate> extends IUtcOnlyClock<TDate>, ILocalOnlyClock<TDate> {}
```

`IClock` is exported from `@time-provider/core`. `ITimestampClock`,
`IMonotonicClock`, `IUtcOnlyClock` and `ILocalOnlyClock` are **not exported** — they are shown here
because they are part of the public API surface, not because you can import
them: they are the shape your `timeProvider.clock` actually has, and which of
their members exists depends on the plugin. You will see these names in editor
tooltips and type errors, which is why they are documented under them. To write
one down, derive it — see [Naming these types](#naming-these-types).

- **`utcNow()`** — the current instant, in UTC, as the plugin's `TDate`.
  Always available. On a sequential clock this read is what consumes the next
  queued instant, and may run due timer callbacks as a side effect.
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
- **`monotonicNow()`** — milliseconds elapsed since `monotonicOrigin`, as a
  `MonotonicMilliseconds` point: the read [`timings`](/api/timings) records
  marks and measures against. On a system clock it is the host's
  `performance.now()`, which wall-clock corrections never move. On a
  deterministic clock it follows the clock, except for a
  [snap](/guide/moving-the-clock), which moves only the wall clock. Free of
  side effects, like `timestampNow()`.
- **`.monotonicOrigin`** — the epoch timestamp `monotonicNow()` counts from:
  the host's `performance.timeOrigin` on a system clock, the clock's time at
  creation on a deterministic one. It never changes.
- **`withTimezone(tz)`** — reconfigures the local timezone on an
  already-built clock, returning `this` for chaining.
- **`hostTimezone()`** — the IANA timezone of the current host machine,
  regardless of what the clock is configured to.
- **`.timezone`** — the currently configured local timezone (a plain
  `TimezoneDefinition`, i.e. a `string`).

## IManualClock

```ts
interface IManualClock<TDate> extends IClock<TDate>, IMovable<IManualClock<TDate>, TDate> {}

interface IUtcOnlyManualClock<TDate>
  extends IUtcOnlyClock<TDate>, IMovable<IUtcOnlyManualClock<TDate>, TDate> {}

interface IMoveSpec {
  years?: number;
  months?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}

/** @deprecated Use IMoveSpec. */
type IAdvanceOptions = IMoveSpec;

interface IMoveOptions {
  as?: "flow" | "sleep" | "snap";
  monotonic?: "running" | "paused";
}

interface IMovable<TSelf, TDate> {
  moveBy(spec: IMoveSpec, options?: IMoveOptions): TSelf;
  moveTo(
    time: "nextTimer" | "lastTimer" | (string & {}) | EpochMilliseconds | TDate,
    options?: IMoveOptions,
  ): TSelf;
  moveUntil(until: "noTimers", options?: { as?: "flow" | "sleep" }): TSelf;
  /** @deprecated Use moveBy. */
  advance(advanceOptions: IMoveSpec): TSelf;
}
```

Only on a manual clock (see [Manual Clock](/guide/manual-clock)) —
`IManualClock` from a timezone-aware plugin, `IUtcOnlyManualClock` from a
UTC-only one. `IMoveSpec`, `IMoveOptions` and `IAdvanceOptions` are exported
from `@time-provider/core`; the other names are not. They describe what
`.asManual()....create()` hands you, so they belong in the reference even
though the names aren't importable. Derive them from the provider type as shown
[below](#naming-these-types).

- **`moveBy(spec, options)`** — moves the clock by `spec`. When more than one
  field is set, they apply to the current time in the fixed order `years →
months → days → hours → minutes → seconds → milliseconds`, since combining
  calendar-variable fields with others can otherwise give a different result
  depending on the order.
- **`moveTo(time, options)`** — moves the clock to `time`: an ISO string,
  `EpochMilliseconds` (see `toInstant()`), a `TDate`, or `"nextTimer"`/`"lastTimer"` for the due time of
  the next or last pending timer.
- **`moveUntil("noTimers", options)`** — moves from timer to timer until none
  is pending, and throws once it has fired the builder's
  `withMoveUntilTimersLimit()` (1000 by default).
- **`options.as`** — `"flow"` (the default) lets time pass, firing each due
  timer at its own time. `"sleep"` jumps both clocks and fires each overdue
  timer once. `"snap"` moves only the wall clock. Only a snap may go backward;
  a negative flow or sleep throws. See [Moving the Clock](/guide/moving-the-clock)
  for the full table and `options.monotonic`.
- **`advance(spec)`** — deprecated. The same as `moveBy(spec)`, except that a
  negative value moves monotonic time back too.

Timer callbacks that become due run synchronously, in-line, before the call
returns — see [Deterministic Timers](/guide/timers).

## Naming these types

You rarely need to. At a build site, let inference do the work — it produces a
narrower type than any annotation you could write, and it carries the extras
composed in by any [addons](/addons/), which an annotation drops:

```ts
using timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .asManual()
  .withInitialTime(0)
  .create();
// clock.moveBy(), plus the addon's own facade, both inferred
```

Where you do need a name — a parameter in a shared test helper, or a package
that emits declarations — start from the provider type and index down. Only the
provider types are exported; the clock interfaces above are reached through
them:

```ts
import type { IManualTimeProvider } from "@time-provider/core/deterministic";

type ManualClock = IManualTimeProvider<Date>["clock"]; // IManualClock<Date>
type MoveSpec = Parameters<ManualClock["moveBy"]>[0]; // IMoveSpec

function movePastRetry(clock: ManualClock, spec: MoveSpec) {
  clock.moveBy(spec);
}
```

Use `IUtcOnlyManualTimeProvider` instead for a UTC-only plugin. To name a
provider that has an addon composed in, intersect with the addon's own exported
shape — e.g. `IManualTimeProvider<Date> & WithCronApi` from
`@time-provider/addon-cron`.
