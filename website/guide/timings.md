# Timings

`timeProvider.timings` records **marks** and **measures**, the way
`performance.mark()` and `performance.measure()` do, but on the
Time-Provider's own monotonic clock. A mark is a named instant. A measure is a
named timespan: a start instant plus a duration.

```ts
timeProvider.timings.mark("fetch-start");
await fetchUsers();
const measure = timeProvider.timings.measure("fetch", { start: "fetch-start" });
measure.duration; // milliseconds between the mark and now
```

## The monotonic clock

Every position is a `MonotonicMilliseconds` point on
[`clock.monotonicNow()`](/api/clock): milliseconds elapsed since
`clock.monotonicOrigin`, the epoch timestamp the clock counts from. Marks and
measures sit on that clock rather than on `timestampNow()` because
wall-clock time can jump. An NTP correction or a user changing the system
time moves `Date.now()`, but never moves a monotonic clock, so a measure never
comes out negative or inflated.

`MonotonicMilliseconds` is its own brand, so a point on this clock can't be
mixed up with an epoch timestamp or a duration. `toMonotonic({ milliseconds })`
makes one from a number, and `monotonicArithmetic` adds and subtracts
durations the way `epochArithmetic` does for epoch instants.

## Backed by the clock strategy

- **System** — marks and measures go to the host's real `performance`
  timeline. It is shared by the whole process: a mark recorded here is visible
  to `performance.getEntries()`, and `timings.entries()` lists marks and
  measures other code recorded there too.
- **Manual** — the Time-Provider keeps its own list, and `monotonicNow()`
  follows the clock: it starts at `0` when the Time-Provider is created, and
  `advance()` moves it. Moving the clock backward moves it backward too.
- **Sequential** — `monotonicNow()` follows the queued instants. Recording a
  mark doesn't consume one, since it reads the clock the side-effect-free way
  `timestampNow()` does. Only `utcNow()`/`localNow()` move to the next instant.
- **Fixed** — time never moves, so every mark sits at `0` and every measure
  that ends at now has a duration of `0`.

Two deterministic Time-Providers never see each other's entries, and none of
them touches the global timeline.

This makes a measured duration something a test can assert exactly:

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

using timeProvider = createTimeProvider.for(plugin).asManual().withInitialTime(0).create();

timeProvider.timings.mark("start");
timeProvider.clock.advance({ seconds: 2 });
timeProvider.timings.mark("end");

timeProvider.timings.measure("work", { start: "start", end: "end" }).duration; // 2000
```

## Reading and clearing entries

`entries(filter?)` returns the recorded marks and measures in the order they
were recorded, and `clear(filter?)` removes exactly what `entries` returns for
the same filter. A filter narrows by `name`, by `kind` (`"mark"` or
`"measure"`), or both:

```ts
timeProvider.timings.entries({ kind: "measure" }); // every measure
timeProvider.timings.clear({ name: "fetch-start", kind: "mark" }); // that mark only
timeProvider.timings.clear(); // everything
```

Entries keep the field names of a native
[`PerformanceEntry`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry)
(`name`, `entryType`, `startTime`, `duration`, `detail`), so one can be handed
to code that expects a native mark or measure, and `JSON.stringify` gives the
same output for both. Code that calls the native signatures themselves
(`performance.now()`, `getEntriesByName()`, `clearMarks()`...) can keep them
through the [compat addon](/addons/compat).

See [ITimings](/api/timings) for the full API, and try marks and measures
against a manual clock in the [Playground](/playground).
