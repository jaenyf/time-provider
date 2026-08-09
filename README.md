# Time-Provider

[![npm](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core)
[![types](https://img.shields.io/npm/types/@time-provider/core)](https://www.npmjs.com/package/@time-provider/core?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/jaenyf/5c996e614c598efb1231d96c28444493/raw/time-provider-tests-count-badge.json)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/core)](https://www.npmjs.com/package/@time-provider/core)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/core?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/core)](https://bundlephobia.com/package/%40time-provider%2Fcore)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/core)](https://bundlephobia.com/package/%40time-provider%2Fcore)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/core)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

<div align="center">
 🌳 Tree-shakable |  
 📦 Zero runtime dependencies |  
 🧪 No global monkey-patching |  
 🛡️ Type-safe |  
 ⏱️ Deterministic timers |  
 🕓 Four clock strategies |  
 🌍 Real timezone support (when applicable) |  
 🔌 Bring your own date library |  
 🧩 Modular & Extensible
</div>

## Time is a dependency

Code coupled to the native `Date` object, `Temporal` objects, any specific date library, or the
environment's scheduler (`setTimeout`, `setInterval`) has an implicit
dependency on the system clock. That's what pushes teams toward global
fake-timer libraries for testing - patching `Date`/timers process-wide,
which affects unrelated code and makes tests harder to reason about.

vs. `jest.useFakeTimers()` / `sinon.useFakeTimers()`: scoped per call site, no global patch, no restore/cleanup step.

`time-provider` makes time an explicit, injectable dependency instead: a
single object exposing a clock, a parser, a scheduler, and a performance API swappable per
call site.  
Note: The _**animation-frame API** is available as [an addon](https://www.npmjs.com/package/@time-provider/addon-animation-frame)._

## Features

- **Four clock strategies**: system (real time), fixed, manual (advance time explicitly), sequential (predefined instants) - same API for production and tests.
- **Deterministic timers**: `setTimeout`/`setInterval` driven by the clock strategy, not the real event loop, so manual/sequential/fixed runs are synchronous and don't depend on wall-clock time.
- **Bring your own date library**: adapters for [Temporal](https://www.npmjs.com/package/@time-provider/plugin-temporal), [Day.js](https://www.npmjs.com/package/@time-provider/plugin-dayjs), [Luxon](https://www.npmjs.com/package/@time-provider/plugin-luxon), [Moment.js](https://www.npmjs.com/package/@time-provider/plugin-moment), [Moment.js + moment-timezone](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone), and [native `Date`](https://www.npmjs.com/package/@time-provider/plugin-native). Your code keeps working with the date type it already uses.
- **Real timezone support** where the underlying library allows it (native `Date`, plain Moment.js are UTC-only - see ARCHITECTURE.md) - `withTimezone(...)` plus `localNow()`/`utcNow()`.
- **Tree-shakable**: no deterministic runtimes bundled when not imported.
- **Zero runtime dependencies** in `@time-provider/core`.

## Install

```bash
npm install @time-provider/core @time-provider/plugin-native
```

Swap `plugin-native` for `plugin-dayjs`, `plugin-luxon`, `plugin-moment`, `plugin-moment-timezone`, or `plugin-temporal` depending on the date library you use.

## Usage

```typescript
// production: import the default production runtime
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

// create a production runtime
const timeProvider = createTimeProvider.for(plugin).create();

class UserService {
  constructor(private readonly timeProvider: ITimeProvider<Date>) {}

  createUser() {
    return { createdAt: this.timeProvider.clock.utcNow() };
  }
}
```

```typescript
// test: import the deterministic runtime
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

// create a deterministic runtime
const timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();

let retries = 0;
timeProvider.scheduler.setInterval(() => retries++, 1000);
timeProvider.clock.advance({ seconds: 3 });

expect(retries).toBe(3);
```

Every time provider exposes the same four-part surface:

```typescript
interface ITimeProvider<TDate> {
  clock: IClock<TDate>; // localNow, utcNow, timestampNow, withTimezone
  parser: IParser<TDate>; // parseToUtc, parseToLocal
  scheduler: IScheduler; // setTimeout, setInterval, setRecurring (+ the matching clear*)
  performance: IPerformance; //now, getEntries, measure,...
}
```

Animation-Frame API comes with [its addon](https://www.npmjs.com/package/@time-provider/addon-animation-frame) that extends ITimeProvider with:

```typescript
interface ITimeProvider<TDate> {
  animation: IAnimationFrameScheduler; //requestAnimationFrame, cancelAnimationFrame
}
```

## Clock strategies

| Strategy   | Behavior                              | Typical use                            |
| ---------- | ------------------------------------- | -------------------------------------- |
| System     | Real time, real timers                | Production                             |
| Fixed      | Always the same instant               | Deterministic single-instant tests     |
| Manual     | Advances only when told to            | Simulations, timer/retry logic tests   |
| Sequential | Returns a predefined instant sequence | Tests asserting on changing timestamps |

```typescript
createTimeProvider.for(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create();
createTimeProvider.for(plugin).asManual().withInitialTime("2026-01-01T00:00Z").create();
createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:01Z")
  .withSequentialTime("2026-01-01T00:02Z")
  .create();
```

> **Manual and sequential clocks run synchronously.** A due `setTimeout`/`setInterval` callback fires in-line, as a direct side effect of the call that made it due (`advance()`, `localNow()`, `utcNow()`) - not on a real event-loop tick. This is what makes them deterministic without `await`, but it means call ordering can differ subtly from a real async run.

## Addons vs. Plugins

Within the scope of this library, these two terms refer to different concepts.

- A **plugin**, is essentially an adapter. It allows you to connect your preferred date library (e.g. Luxon, Temporal, etc.) to the Time Provider core library without adding any new functionality. Its sole purpose is to bridge the two libraries (e.g. [the dayjs plugin](https://www.npmjs.com/package/@time-provider/plugin-dayjs)).
- An **addon**, as the name suggests, extends the library by introducing new functionality or enhancing existing facades (e.g. [the animation-frame API addon](https://www.npmjs.com/package/@time-provider/addon-animation-frame))

### Available addons

- [Animation-frame API addon](https://www.npmjs.com/package/@time-provider/addon-animation-frame) - access browser-specific animation frame scheduling
- [Cron addon](https://www.npmjs.com/package/@time-provider/addon-cron) - schedule recurring callbacks with the cron syntax or a JSON-friendlier one
- [ETA addon](https://www.npmjs.com/package/@time-provider/addon-eta) - get the ETA (estimated time of arrival) for a task by notifying its progression

## Learn more

- [Guide](https://jaenyf.github.io/time-provider/guide/) - Read the guide
- [API](https://jaenyf.github.io/time-provider/api/) - Browse the library API
- [ARCHITECTURE.md](https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md) - how the packages fit together, the plugin/adapter model, why native `Date` and plain Moment.js are UTC-only.
- [CONTRIBUTING.md](https://github.com/jaenyf/time-provider/blob/main/CONTRIBUTING.md) - development setup, workflow, reporting bugs/features.
- [BENCHMARK.md](https://github.com/jaenyf/time-provider/blob/main/BENCHMARK.md) - faster than jest/sinon fake timers.
- Per-package README (`packages/<name>/README.md`) for adapter-specific notes.
- [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/CHANGELOG.md) - changes log from the core library and all plugins.

## License

[MIT](./LICENSE)
