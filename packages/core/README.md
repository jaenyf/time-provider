# 🕰️ Time-Provider

[![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

> _"Fake timers that change unrelated behavior are not substitutes for a clock; they are substitutes for the world."_
>
> — Barbara Liskov _(who could have said this)_

**Time is an application dependency, not a runtime detail.**

`time-provider` makes time explicit, testable, and independent from global state.

---

## Time should be SOLID! (that's ~~DEEP~~ _DIP_) 🌱

Stop accessing time through global APIs:

- `Date`
- `Temporal.Now`
- `setTimeout`
- `setInterval`

This makes time an implicit dependency. And that's why you might have started using _**global fake timers**_.

This creates problems:

- ❌ business logic becomes coupled to the system clock
- ❌ tests depend on real time passing
- ❌ timers are difficult to control deterministically
- ❌ different application boundaries cannot easily define their own notion of time

✅ `time-provider` applies dependency inversion to time.

Time becomes an explicit dependency that can be replaced depending on the context.

### What if I already have a Clock abstraction? 🦆

You might already have a Clock abstraction and replace its implementation in tests with a fake timer-based solution.

If so, you may want to consider these points :

- ❌ [A clock interface may be insufficient](#why-not-just-create-a-clock-interface).
- ✅ `time-provider` provides a **lightweight alternative** to traditional fake timer libraries, as demonstrated by our [benchmark](BENCHMARK.md).
- ✅ `time-provider` has a neat and concise builder interface to create your runtime ([see below](#usage)).
- ✅ You are not bound to the Date object or a single date library. Use the date library you already have and keep type-safe access through the adapter.

|                                         | Jest/Sinon | time-provider |
| --------------------------------------- | ---------- | ------------- |
| Leaves globals untouched                | ❌         | ✅            |
| Allows multiple time contexts           | ❌         | ✅            |
| Works with domain injection             | ❌         | ✅            |
| Provides a runtime abstraction boundary | ❌         | ✅            |
| Controls scheduling                     | ✅         | ✅            |
| Preserves date abstraction boundary     | ❌         | ✅            |

You may want to give it a try!

---

## What is it?

`time-provider` is a TypeScript library for injecting **time and timers** into applications with the date library of your choice.

It provides a single boundary for:

- reading the current time
- parsing timestamps
- scheduling future actions
- controlling time progression during tests

... with the date library of your choice.

```typescript
interface ITimeProvider<TDate> {
  clock: IClock<TDate>;
  parser: IParser<TDate>;
  scheduler: IScheduler;
}
```

```typescript
interface IClock<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  withLocalTimezone(localTimezone: TimezoneDefinition): IClock<TDate>;
}
```

```typescript
interface IParser<TDate> {
  parse(input: string | number | TDate): TDate;
}
```

```typescript
interface IScheduler {
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle;
  clearTimeout(handle: SetTimeoutHandle): void;
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle;
  clearInterval(handle: SetIntervalHandle): void;
}
```

A time provider exposes:

- **time access**
- **timestamp parsing**
- **scheduling capabilities**

Together they cover the main ways applications interact with time.

---

## Application boundaries can define their own time

"Now" can vary depending on your app domain or your business logic.

Different parts of an application may require different notions of time:

- domain logic may depend on a business-defined clock
- background jobs may depend on processing time
- simulations may use virtual time
- tests may use deterministic time

Global APIs force all these cases into the same hidden dependency.

With dependency injection, each boundary receives the time provider it needs.

---

## 💫 Keep your date library

`time-provider` neither introduces a new date model nor forces you into one.

Your application keeps using the date library it already uses.

Supported adapters include:

- `Temporal`
- Native `Date`
- `Day.js`
- `Luxon`
- `Moment.js`

The adapter preserves the native date type with type-safe signatures.

`time-provider` provides the dependency boundary around time while keeping your existing date stack.

---

## Why not just create a Clock interface? 🧭

**A clock tells you what time it is. A time provider defines how your application interacts with time.**

A clock abstraction solves one problem:

> What time is it?

But applications usually depend on more than reading time.

They also need:

- scheduling future actions
- deterministic timer execution
- controlled time progression in tests
- timestamp parsing

`time-provider` keeps these concerns together:

```
TimeProvider
├── Clock
│   ├── localNow()
│   └── utcNow()
│
├── Parser
│   └── parse()
│
└── Scheduler
    ├── setTimeout()
    ├── clearTimeout()
    ├── setInterval()
    └── clearInterval()
```

---

## 🧩 Features

- ✅ Dependency-injectable clocks and timers
- ✅ Deterministic timers without replacing global APIs
- ✅ Multiple clock strategies
- ✅ Multiple isolated time contexts in the same application
- ✅ Support for multiple date libraries
- ✅ Native date types preserved
- ✅ Type-safe return values

---

# 🚀 Quick start

Install the core package and an adapter:

```bash
npm install @time-provider/core @time-provider/plugin-native
```

Production:

```typescript
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

const timeProvider = createTimeProvider.for(plugin).create();
```

Testing:

```typescript
const timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00Z")
  .create();

let retries = 0;

timeProvider.scheduler.setInterval(() => {
  retries++;
}, 1000);

timeProvider.clock.advance({
  seconds: 3,
});

expect(retries).toBe(3);
```

---

# Usage

## Dependency injection

```typescript
import type { ITimeProvider } from "@time-provider/core";
import { Temporal } from "@js-temporal/polyfill";

class UserService {
  constructor(private readonly timeProvider: ITimeProvider<Temporal.ZonedDateTime>) {}

  createUser() {
    return {
      createdAt: this.timeProvider.clock.utcNow(),
    };
  }
}
```

The service does not know whether time comes from:

- the system clock
- a fixed clock
- a simulation
- a test clock

It only depends on the time capability it receives.

---

## Testing deterministic time

```typescript
const timeProvider = createTimeProvider
  .for(plugin)
  .asFixed()
  .withFixedTime("2026-01-01T00:00Z")
  .create();

const sut = new UserService(timeProvider);

expect(sut.createUser().createdAt).toEqual(timeProvider.clock.utcNow());
```

---

## Timers

The scheduler follows the selected clock strategy.

With a [manual clock](#manual-clock), callbacks execute when time advances.

```typescript
const timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00Z")
  .create();

let count = 0;

timeProvider.scheduler.setInterval(() => {
  count++;
}, 1000);

timeProvider.clock.advance({
  seconds: 3,
});

expect(count).toBe(3);
```

### Execution model: synchronous vs. asynchronous

This is a deliberate difference from native timers, and it's important to keep in mind:

> ⚠️ Deterministic clocks intentionally do not emulate the JavaScript event loop. They are synchronous.

- **System clock**: `setTimeout`/`setInterval` delegate to the real, native timers. Callbacks run **asynchronously**, on the real event loop, exactly like in production code.
- **Manual and Sequential clocks**: callbacks run **synchronously, in-line**, at the moment they become due. A due callback can run as a direct side effect of `setTimeout`/`setInterval` itself (e.g. a delay of `0` or a negative value is already due when scheduled), or of `advance()`, `clock.localNow()`, or `clock.utcNow()` (whichever call causes the clock to reach or pass the callback's due time). There is no event loop tick involved: the callback has already run by the time the triggering call returns.
- **Fixed clock**: time never advances, so no scheduled `setTimeout`/`setInterval` callback is ever due — it never runs, regardless of the delay it was registered with.

This synchronous execution is what makes the manual and sequential clocks deterministic: there is no need to `await` anything, or to yield to the event loop, for a due callback to have run. The trade-off is that call ordering can differ subtly from a real asynchronous run — for instance, code that assumes a `setTimeout(fn, 0)` always defers `fn` past the current synchronous block will observe it running immediately instead when using a manual or sequential clock.

---

# Clock

The clock is controlling the behavior of the scheduler as well as providing time through `utcNow` and `localNow` (if plugin supports localized time)

### ⚠️ Note on the native Date object and the `plugin-native` adapter

The native Date object has no real support for timezones and therefor has no abilities to provide a true localized time (that's why so much time libraries exist).  
So the `plugin-native` adapter **only exposes utcNow()** in its facade.

## Clock strategies

### System clock

The default production strategy.

Uses:

- current system time
- native runtime timers

```typescript
const timeProvider = createTimeProvider.for(plugin).create();
```

---

### Fixed clock

Always returns the same instant.

Useful for deterministic tests.

```typescript
const timeProvider = createTimeProvider
  .for(plugin)
  .asFixed()
  .withFixedTime("2026-01-01T00:00Z")
  .create();
```

---

### Manual clock

Time progresses only when explicitly advanced.

Useful for:

- simulations
- integration tests
- workflows depending on elapsed time

```typescript
time.advance({
  seconds: 5,
});
```

---

### Sequential clock

Returns a predefined sequence of instants.

Useful when testing code that depends on changing timestamps.

```typescript
const timeProvider = createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:01Z")
  .withSequentialTime("2026-01-01T00:02Z")
  .create();
```

---

# 🛠️ Installation

```bash
npm install @time-provider/core @time-provider/plugin-temporal
```

Adapters:

```bash
npm install @time-provider/plugin-native
npm install @time-provider/plugin-dayjs
npm install @time-provider/plugin-luxon
npm install @time-provider/plugin-moment
```

---

# Architecture

The library is split into:

- `@time-provider/core`
  - common abstractions
  - provider creation
  - clock strategies
  - scheduler behavior

- adapters
  - map the generic API to a date library
  - preserve native date types

---

# Use cases

- Testing expiration logic
- Testing retry policies
- Simulating workflows
- Running deterministic integration tests
- Keeping domain logic independent from system time
- Supporting multiple isolated time contexts

---

# License 📜

MIT
