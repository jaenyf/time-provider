# Time-Provider

[![npm](https://img.shields.io/npm/v/@time-provider%2Fcore.svg?cacheSeconds=43200)](https://www.npmjs.com/package/@time-provider/core)
[![jsr](https://img.shields.io/jsr/v/@time-provider/core?cacheSeconds=43200)](https://jsr.io/@time-provider/core)
[![jsr score](https://jsr.io/badges/@time-provider/core/score)](https://jsr.io/@time-provider/core/score)
[![types](https://img.shields.io/npm/types/@time-provider/core?cacheSeconds=43200)](https://www.npmjs.com/package/@time-provider/core?activeTab=code)
[![Node.js ^18.18 || >=20.4](https://img.shields.io/badge/node-%5E18.18%20%7C%7C%20%3E%3D20.4-blue?logo=node.js&logoColor=white&cacheSeconds=43200)](https://github.com/jaenyf/time-provider/blob/main/package.json)
[![Deno ~1.39.1 || >=1.43](https://img.shields.io/badge/deno-~1.39.1%20%7C%7C%20%3E%3D1.43-blue?logo=deno&logoColor=white&cacheSeconds=43200)](https://jsr.io/@time-provider/core)
[![module ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue?logo=javascript&logoColor=white&cacheSeconds=43200)](https://github.com/jaenyf/time-provider/blob/main/packages/core/package.json)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github&cacheSeconds=43200)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![tests](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/jaenyf/5c996e614c598efb1231d96c28444493/raw/time-provider-tests-count-badge.json&cacheSeconds=43200)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![mutation score](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/jaenyf/5c996e614c598efb1231d96c28444493/raw/time-provider-mutation-score-badge.json&cacheSeconds=43200)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![socket](https://badge.socket.dev/npm/package/@time-provider/core/latest)](https://socket.dev/npm/package/@time-provider/core)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/core?cacheSeconds=43200)](https://www.npmjs.com/package/@time-provider/core)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?cacheSeconds=43200)](https://www.npmjs.com/package/@time-provider/core?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/core?cacheSeconds=43200)](https://bundlejs.com/?q=%40time-provider%2Fcore)
[![minified size](https://img.shields.io/bundlejs/size/@time-provider/core?cacheSeconds=43200)](https://bundlejs.com/?q=%40time-provider%2Fcore)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/core?cacheSeconds=43200)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="285">
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

## Solid clock. Own time. Better tests.

Why monkey-patch the global clock to test your code?
Why rewrite the same time interface to inject it?

What if that interface doubled as your fake timers?
What if it were also type-safe and thoroughly tested?

Time-Provider is that interface: ready to use, fully deterministic in tests, and [several times faster](https://github.com/jaenyf/time-provider/blob/main/BENCHMARK.md) than Jest or Sinon fake timers.
Bring your own [date library](#available-plugins), and extend it with [addons](#available-addons)!

## Philosophy

Time is scoped per call site: no global patch, no restore or cleanup step.

[Compare it to Jest fake timers](https://jaenyf.github.io/time-provider/guide/vs-jest) or [Compare it to Sinon fake timers](https://jaenyf.github.io/time-provider/guide/vs-sinon).

Time-Provider makes time an explicit, injectable dependency: a single object exposing a clock, a converter, a scheduler, and timings, swappable per call site.

_Note: Non baseline or additional features are available as [addons](#available-addons)._

## Features

- **Four clock strategies**: system, manual, sequential and fixed - same API for production and tests.
- **Time flow and wall clock steps**: make time flow, simulate a host sleep or a wall-clock correction. Also step from timer to timer.
- **Deterministic timers**: driven by the clock strategy and run synchronously.
- **Bring your own date library**: multiple [date library plugins](#available-plugins) are available. Your code keeps working with the date type it already uses.
- **Timezone support**: backed by the underlying library of your choice.
- **Tree-shakable**: no deterministic runtimes bundled when not imported.
- **Zero runtime dependencies** in `@time-provider/core`.

## Install

```bash
npm install @time-provider/core @time-provider/plugin-native
```

Swap `plugin-native` for `plugin-dayjs`, `plugin-luxon`, `plugin-moment`, `plugin-moment-timezone`, or `plugin-temporal` depending on the date library you use.

## Usage

```typescript
// PROD: import the default production runtime
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
// TEST: import the deterministic runtime
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

// create a deterministic runtime
it("sets the creation date to now", () => {
  const now = "2026-01-01T00:00:00.000Z";
  using timeProvider = createTimeProvider.for(plugin).asManual().withInitialTime(now).create();

  expect(new UserService(timeProvider).createUser().createdAt).toEqual(new Date(now));
});
```

Similar idea for timers, closer to a real service - a retry/backoff loop injected with the time provider, unaware of which strategy backs it:

```typescript
// PROD: a retry/backoff service, injected with the real time provider
class RetryingOperation {
  constructor(private readonly timeProvider: ITimeProvider<Date>) {}

  run(operation: () => boolean, onGiveUp: () => void, maxAttempts = 3) {
    let attempt = 0;
    this.timeProvider.scheduler.timers.recurring(() => {
      attempt++;
      if (operation()) return false; // succeeded, stop retrying
      if (attempt >= maxAttempts) {
        onGiveUp();
        return false;
      }
      return { seconds: attempt }; // failed, backoff: 1s, 2s, 3s...
    });
  }
}

new RetryingOperation(timeProvider).run(sendRequest, pageOnCallEngineer);
```

```typescript
// TEST: same service, injected with a manual provider instead
describe("RetryingOperation ~ run", () => {
  it("retries until it succeeds", () => {
    using timeProvider = createTimeProvider.for(plugin).asManual().create();
    let attempts = 0;
    let gaveUp = false;
    new RetryingOperation(timeProvider).run(
      () => ++attempts === 3, // succeeds on the 3rd try
      () => (gaveUp = true),
    );

    timeProvider.clock.moveBy({ seconds: 1 }); // 2nd attempt
    timeProvider.clock.moveBy({ seconds: 2 }); // 3rd attempt, succeeds

    expect(attempts).toBe(3);
    expect(gaveUp).toBe(false);
  });
});
```

## Clock strategies

| Strategy   | Behavior                              | Typical use                               | Note                                |
| ---------- | ------------------------------------- | ----------------------------------------- | ----------------------------------- |
| System     | Real time, real timers                | Production                                |                                     |
| Fixed      | Always the same instant               | Deterministic frozen single-instant tests | Timers never fire                   |
| Manual     | Advances only when told to            | Simulations, timer/retry logic tests      |                                     |
| Sequential | Returns a predefined instant sequence | Tests asserting on changing timestamps    | Time reads move to the next instant |

```typescript
createTimeProvider.for(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create();
createTimeProvider.for(plugin).asManual().withInitialTime("2026-01-01T00:00Z").create();
createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:01Z")
  .withSequentialTime(1767225720000)
  .create();
```

> **Manual and sequential clocks run synchronously.** A due timer callback fires in-line, as a direct side effect of the call that made it due (and not on a real event-loop tick). This is what makes them deterministic without `await`, but it also means call ordering can differ subtly from a real async run.

## Addons vs. Plugins

Within the scope of this library, these two terms refer to different concepts.

- A **plugin** is essentially an adapter. It allows you to connect your preferred date library to the Time-Provider core library without adding any new functionality. Its sole purpose is to bridge the two libraries.
- An **addon**, as the name suggests, extends the library by introducing new functionality or enhancing existing facades.

### Available addons

- [Animation-frame API addon](https://www.npmjs.com/package/@time-provider/addon-animation-frame) - access browser-specific animation frame timers
- [Compat addon](https://www.npmjs.com/package/@time-provider/addon-compat) - keep calling native-style setTimeout/setInterval/queueMicrotask/performance while you migrate
- [Cron addon](https://www.npmjs.com/package/@time-provider/addon-cron) - schedule recurring callbacks with the cron syntax or a JSON-friendlier one
- [ETA addon](https://www.npmjs.com/package/@time-provider/addon-eta) - get the ETA (estimated time of arrival) for a task by notifying its progression
- [Idle addon](https://www.npmjs.com/package/@time-provider/addon-idle) - run callbacks when the host reports itself idle, drained on demand on a deterministic clock

### Available plugins

- [Day.js plugin](https://www.npmjs.com/package/@time-provider/plugin-dayjs) - use Day.js Dayjs objects
- [Luxon plugin](https://www.npmjs.com/package/@time-provider/plugin-luxon) - use Luxon DateTime objects
- [Moment.js plugin](https://www.npmjs.com/package/@time-provider/plugin-moment) - use Moment.js Moment objects
- [Moment.js (with timezones) plugin](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone) - use Moment.js Moment objects with local time or time zone support
- [Native JS Date plugin](https://www.npmjs.com/package/@time-provider/plugin-native) - use native JS Date objects
- [Temporal plugin](https://www.npmjs.com/package/@time-provider/plugin-temporal) - use Temporal ZonedDateTime objects

## Baseline API

Every time provider exposes the same four-part surface:

```typescript
interface ITimeProvider<TDate> extends IHasAbortSignal, IDisposable {
  clock: IClock<TDate>; // localNow, utcNow, timestampNow, monotonicNow, withTimezone
  converter: IConverter<TDate>; // convertToUtc, convertToLocal
  scheduler: IScheduler; // timers (once, every, recurring, wait), microtasks
  timings: ITimings; // mark, measure, entries, clear
}
```

`clock` gives the current time: as a timestamp, as a monotonic value, or as a UTC or local date in your date library's type.

`converter` turns a string, a timestamp or a date into a UTC (or local) date of your date library's type.

`scheduler` is where everything that schedules a callback to run later sits, timers included.

`timings` holds performance marks and measures. Monotonic time and its origin stay on `clock`.

## Learn more

- [Guide](https://jaenyf.github.io/time-provider/guide/) - Read the guide
- [API](https://jaenyf.github.io/time-provider/api/) - Browse the library API
- [ARCHITECTURE.md](https://github.com/jaenyf/time-provider/blob/main/ARCHITECTURE.md) - how the packages fit together, the plugin/adapter model, why native `Date` and plain Moment.js are UTC-only.
- [CONTRIBUTING.md](https://github.com/jaenyf/time-provider/blob/main/CONTRIBUTING.md) - development setup, workflow, reporting bugs/features.
- [BENCHMARK.md](https://github.com/jaenyf/time-provider/blob/main/BENCHMARK.md) - faster than Jest/Sinon fake timers.
- Per-package README (`packages/<name>/README.md`) for adapter-specific notes.
- [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/CHANGELOG.md) - changes log from the core library and all plugins.

## License

[MIT](./LICENSE)
