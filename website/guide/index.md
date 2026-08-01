# What is Time-Provider

Code coupled to the native `Date` object, `Temporal` objects, a specific date
library, or the environment's scheduler (`setTimeout`, `setInterval`) has an
implicit dependency on the system clock. That's what pushes teams toward
global fake-timer libraries for testing — patching `Date`/timers
process-wide, which affects unrelated code and makes tests harder to reason
about.

`time-provider` makes time an explicit, injectable dependency instead: a
single object — an `ITimeProvider` — exposing a **clock**, a **parser**, a
**scheduler**, and a **performance** API, swappable per call site.

```ts
interface ITimeProvider<TDate> {
  clock: IClock<TDate>; // localNow(), utcNow(), withTimezone()
  parser: IParser<TDate>; // parseToUtc(), parseToLocal()
  scheduler: IScheduler; // setTimeout/clearTimeout/setInterval/clearInterval
  performance: IPerformance; // now(), mark(), measure(), getEntries()
}
```

Compared to `jest.useFakeTimers()` / `sinon.useFakeTimers()`: `time-provider`
is scoped per call site, does not globally patch anything, and needs no
restore/cleanup step.

## Why not just mock `Date`?

Mocking `Date` (or `sinon`/`jest` fake timers) patches a global. Every piece
of code that touches the clock during that test is affected, whether or not
it's under test, and every test file has to remember to install and restore
the patch. `time-provider` instead makes the clock a constructor argument —
production code takes an `ITimeProvider`, and swaps a **system** clock for a
**manual** or **sequential** one only in the tests that need deterministic
time.

## Type-safe end-to-end

Every public API is generic over the date type your plugin returns —
`ITimeProvider<TDate>`, `IClock<TDate>`, and `IParser<TDate>` carry it
through, so `clock.utcNow()` and `parser.parseToLocal()` come back typed as
a native `Date`, a Luxon `DateTime`, a `Temporal.ZonedDateTime`, or
whichever adapter you picked — no casts required. Mixing incompatible
pieces — a `/deterministic` plugin with the system `createTimeProvider`, or
calling `withTimezone()` on a UTC-only plugin — is a compile error, not
something you find out at runtime. See [Mental Model](/guide/mental-model)
for how the type-level guarantees are structured.

## Zero runtime dependencies

`@time-provider/core` ships no runtime dependencies of its own and works
with plain timestamps internally. Each plugin depends only on core and the
one date library it adapts, so picking Day.js, say, never pulls Luxon or
Moment into your bundle — see the package's own
[ARCHITECTURE.md](https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md#tree-shaking)
for how this is checked in CI.

## The four clock strategies

| Strategy   | Behavior                              | Typical use                            |
| ---------- | ------------------------------------- | -------------------------------------- |
| System     | Real time, real timers                | Production                             |
| Fixed      | Always the same instant               | Deterministic single-instant tests     |
| Manual     | Advances only when told to            | Simulations, timer/retry logic tests   |
| Sequential | Returns a predefined instant sequence | Tests asserting on changing timestamps |

System lives behind `@time-provider/core`; Fixed, Manual, and Sequential
live behind the separate `@time-provider/core/deterministic` entry point, so
a production bundle never pulls in test-only code — see
[Mental Model](/guide/mental-model). See [Clock Strategies](/guide/clock-strategies)
for details on each.

## Bring your own date library

Six adapters ("plugins") plug in the date type your codebase already uses:
[native `Date`](/plugins/native), [Day.js](/plugins/dayjs),
[Luxon](/plugins/luxon), [Moment.js](/plugins/moment),
[Moment.js + moment-timezone](/plugins/moment-timezone), and [Temporal](/plugins/temporal).

## Addons vs. plugins

A **plugin** bridges one date library to the `ITimeProvider` pipeline and
adds no new functionality of its own. An **addon** extends a built
Time-Provider with an extra facade — e.g.
[`@time-provider/addon-animation-frame`](/guide/addons) adds an `.animation`
property backed by the same clock strategy. See [Addons](/guide/addons).

Next: [Install](/guide/install) · [Quick Start](/guide/quick-start) · [Try it in the Playground](/playground)
