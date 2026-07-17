# Time-Provider

[![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

> _"Fake timers that change unrelated behavior are not substitutes for a clock; they are substitutes for the world."_
>
> — Barbara Liskov _(who could have said this)_

**Time is an application dependency, not a runtime detail.**

`time-provider` makes time explicit, testable, and independent from global state.

---

## Time should be SOLID! (that's ~~DEEP~~ _DIP_)

Most applications access time through global APIs:

- `Date`
- `Temporal.Now`
- `setTimeout`
- `setInterval`

These APIs are convenient, but they make time an implicit dependency.

This creates problems:

- business logic becomes coupled to the system clock
- tests depend on real time passing
- timers are difficult to control deterministically
- different application boundaries cannot easily define their own notion of time

`time-provider` applies dependency inversion to time.

Instead of:

```
Application
    |
    ▼
Global runtime clock
```

you get:

```
Application boundary
    |
    ▼
TimeProvider
    |
    ├── Time access
    ├── Parser
    └── Scheduler
```

Time becomes an explicit dependency that can be replaced depending on the context.

---

## What is it?

`time-provider` is a TypeScript library for injecting **time and timers** into applications.

It provides a single boundary for:

- reading the current time
- parsing timestamps
- scheduling future actions
- controlling time progression during tests

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

## Keep your date library

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

## Why not just create a Clock interface?

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

## Features

- Dependency-injectable clocks and timers
- Deterministic timers without replacing global APIs
- Multiple clock strategies
- Multiple isolated time contexts in the same application
- Support for multiple date libraries
- Native date types preserved
- Type-safe return values

---

# Quick start

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
  constructor(private readonly timeProvider: ITimeProvider<Temporal.Instant>) {}

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

const sut = new UserService(time);

expect(sut.createUser().createdAt).toEqual(timeProvider.clock.utcNow());
```

---

## Timers

The scheduler follows the selected clock strategy.

With a manual clock, callbacks execute when time advances.

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

---

# Clock strategies

## System clock

The default production strategy.

Uses:

- current system time
- native runtime timers

```typescript
const timeProvider = createTimeProvider.for(plugin).create();
```

---

## Fixed clock

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

## Manual clock

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

## Sequential clock

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

# Installation

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

# License

MIT
