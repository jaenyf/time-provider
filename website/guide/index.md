# What is Time-Provider

Time-Provider is a DI-friendly plain object that can be used to improve time-related code testability.

It avoids coupling codebase to any Date library or environment's timers.

Therefore, it allows to get rid of any global fake-timer libraries for testing (that patch `Date`/timers
process-wide) and ensure scoped time per tests doesn't affect unrelated code, making tests intent easier to grasp and to maintain.

It groups all time-related baseline functions into an explicit, injectable single interface: an `ITimeProvider` — exposing a **clock**, a **converter**, a
**scheduler**, and **timings**, swappable per call site.

```ts
interface ITimeProvider<TDate> {
  clock: IClock<TDate>; // localNow(), utcNow(), timestampNow(), monotonicNow(), withTimezone()
  converter: IConverter<TDate>; // convertToUtc(), convertToLocal()
  scheduler: IScheduler; // timers (once(), every(), recurring(), wait()), microtasks
  timings: ITimings; // mark(), measure(), entries(), clear()
}
```

[Compare it to Jest fake timers](https://jaenyf.github.io/time-provider/guide/vs-jest) or [Compare it to Sinon fake timers](https://jaenyf.github.io/time-provider/guide/vs-sinon).

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
`ITimeProvider<TDate>`, `IClock<TDate>`, and `IConverter<TDate>` carry it
through, so `clock.utcNow()` and `converter.convertToLocal()` come back typed as
a native `Date`, a Luxon `DateTime`, a `Temporal.ZonedDateTime`, or
whichever adapter you picked — no casts required.

Mixing incompatible pieces — a `/deterministic` plugin with the system `createTimeProvider`, or
calling `withTimezone()` on a UTC-only plugin — is a compile error, not
something you find out at runtime.

See [Mental Model](/guide/mental-model) for how the type-level guarantees are structured.

## Zero runtime dependencies

`@time-provider/core` ships no runtime dependencies of its own. Each plugin depends only on core and the
one date library it adapts — see the
[ARCHITECTURE.md](https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md#tree-shaking)
documentation for more details.

## The four clock strategies

| Strategy       | Kind          | Behavior                              | Typical use                                                                                                          |
| -------------- | ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **System**     | Live          | System time, real timers              | Production                                                                                                           |
| **Fixed**      | Deterministic | Always the same instant               | Explicit single-instant tests intent                                                                                 |
| **Manual**     | Deterministic | Advances only when told to            | Majority of time-related tests, timer/retry logic tests, simulation                                                  |
| **Sequential** | Deterministic | Returns a predefined instant sequence | Fine-grained time changes accross multiple time reads that couldn't be simulated withing the scope of a manual clock |

**System** lives behind `@time-provider/core` entry point.  
**Fixed**, **Manual**, and **Sequential**
live behind the separate `@time-provider/core/deterministic` entry point.  
Tree-shaking ensures a production bundle never pulls in test-only code — see
[Mental Model](/guide/mental-model).  
For detail on each clock, see [Clock Strategies](/guide/clock-strategies).

## Bring your own date library

Six adapters ("plugins") plug in the date type your codebase already uses:  
[Native javascript Date](/plugins/native), [Day.js](/plugins/dayjs),
[Luxon](/plugins/luxon), [Moment.js](/plugins/moment),
[Moment.js + moment-timezone](/plugins/moment-timezone), and [Temporal](/plugins/temporal).

## Addons vs. plugins

A **plugin** simply bridges one date library to the `ITimeProvider` pipeline.  
An **addon** extends a built Time-Provider with an extra facade — e.g.
[`@time-provider/addon-animation-frame`](/addons/) adds a `scheduler.animation`
property backed by the same clock strategy.  
For more details on each, see the [Plugins](/plugins/) or [Addons](/addons/) documentation.
