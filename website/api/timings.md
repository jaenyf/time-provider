# ITimings

```ts
type DurationMilliseconds = Brand<number, "DurationMilliseconds">;
type MonotonicMilliseconds = Brand<number, "MonotonicMilliseconds">; // a point since monotonicOrigin

type TimingKind = "mark" | "measure";

interface ITimingEntry {
  readonly name: string;
  readonly entryType: TimingKind;
  readonly startTime: MonotonicMilliseconds;
  readonly duration: DurationMilliseconds;
  readonly detail: unknown; // null when not given
  toJSON(): unknown;
}

interface ITimingMark extends ITimingEntry {
  readonly entryType: "mark";
}

interface ITimingMeasure extends ITimingEntry {
  readonly entryType: "measure";
}

interface ITimingMarkOptions {
  startTime?: MonotonicMilliseconds;
  detail?: unknown;
}

interface ITimingMeasureOptions {
  start?: string | MonotonicMilliseconds;
  end?: string | MonotonicMilliseconds;
  duration?: DurationMilliseconds;
  detail?: unknown;
}

interface ITimingsFilter {
  name?: string;
  kind?: TimingKind;
}

interface ITimings {
  mark(name: string, options?: ITimingMarkOptions): ITimingMark;
  measure(name: string, options?: ITimingMeasureOptions): ITimingMeasure;
  entries(filter?: ITimingsFilter): readonly ITimingEntry[];
  clear(filter?: ITimingsFilter): void;
}
```

`timeProvider.timings` records marks (named instants) and measures (named
timespans) on the Time-Provider's monotonic clock,
[`clock.monotonicNow()`](/api/clock):

```ts
timeProvider.timings.mark("start");
doWork();
const measure = timeProvider.timings.measure("work", { start: "start" });
measure.duration; // milliseconds between the "start" mark and now
```

- **`mark(name, options?)`** — records an `ITimingMark` at
  `clock.monotonicNow()`, or at `options.startTime` if given.
- **`measure(name, options?)`** — records an `ITimingMeasure`. `start` and
  `end` each take a mark name or a `MonotonicMilliseconds` point, and default
  to the origin and to now; `duration` stands in for whichever of the two is
  missing. Throws a `TypeError` when `start`, `end` and `duration` are all
  given, or when `duration` comes alone, and throws when a named mark does not
  exist.
- **`entries(filter?)`** — the recorded marks and measures, in the order they
  were recorded. `filter.name` and `filter.kind` narrow them; an omitted field
  matches everything.
- **`clear(filter?)`** — removes exactly the entries `entries(filter)` returns.

See [Timings](/guide/timings) for how they behave on each clock strategy.

To make a point from a number, use `toMonotonic({ milliseconds })`;
`monotonicArithmetic` adds and subtracts durations the way `epochArithmetic`
does for epoch instants.

Entries keep the field names of the native
[`PerformanceEntry`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry),
so one can be passed wherever a native mark or measure is expected, and
`JSON.stringify` gives the same output for both. For the native call
signatures themselves (`performance.now()`, `getEntriesByName()`,
`clearMarks()`...), use the [compat addon](/addons/compat).

## Backed by the clock strategy

Like `clock` and `scheduler`, `timings` is driven by whichever strategy built
the Time-Provider:

- **System** — marks and measures go to the host's real `performance`
  timeline, which is process-wide: a mark recorded here is visible to
  `performance.getEntries()` and to every other system Time-Provider in the
  process, and `entries()` lists marks and measures other code recorded
  there too. Entries the host records itself (`resource`, `navigation`,
  `paint`...) are left out.
- **Fixed, Manual, Sequential** — the runtime keeps its own entry list, and
  `monotonicNow()` moves (or stays frozen) exactly in step with the clock, so
  a measure between two marks reflects simulated time elapsed, not wall-clock
  time. Nothing here touches the global timeline, and two deterministic
  Time-Providers never see each other's entries.
