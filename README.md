# Time-Provider

**Inject time into your application—without global state.**

[![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core)
[![CI](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

> Time-dependent code is notoriously difficult to test. Instead of calling new Date() or Temporal.Now.instant() directly throughout your application, inject a clock that can be swapped for a fixed or manually controlled implementation during testing.

## What is it?

A TypeScript library for injecting time into your application, making time-dependent code deterministic, easy to test, and independent of your date library.

Supported adapters include:

- `Temporal`
- Native `Date`
- `Day.js`
- `Luxon`
- `Moment.js`

---

## Why not fake timers?

- ❌ Fake timers mutate global runtime behavior by overriding global APIs like Date and setTimeout.
- ❌ They can leak between tests and cause flaky behavior.
- ❌ They don’t compose well across libraries.

✅ Unlike fake timers (Jest, Vitest, Sinon), `time-provider` doesn't modify global state. Every clock is explicit, isolated, and can coexist with other clocks in the same process.

## Overview

`time-provider` exposes a clock abstraction that can be swapped depending on runtime context:

- System clock (production): The default clock.
- Fixed clock (for testing): A deterministic clock always returning the same instant.
- Manual clock (controlled time progression): A clock that can be advanced manually.

It remains agnostic to the underlying date library, so you can adopt it with your existing stack.

## Features

- Dependency-injectable clocks
- Multiple time strategies (system, fixed, manual)
- Pluggable date libraries
- Type-safe return types

## Quick start

```typescript
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

// production
const clock = createTimeProvider.for(plugin).create();

// test
const clock = createTimeProvider
  .for(plugin)
  .asFixed()
  .withInitialTime("2026-01-01T00:00Z")
  .create();

console.log(clock.utcNow());
```

## Usage

### Dependency injection example

```typescript
import { createTimeProvider } from "@time-provider/core";
import type { ITimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";

const clock = createTimeProvider.for(plugin).create();

class UserService {
  constructor(private readonly clock: ITimeProvider<Temporal.Instant>) {}

  createUser() {
    return {
      createdAt: this.clock.utcNow(),
    };
  }
}
```

### Testing example

```typescript
it("sets createdAt deterministically", () => {
  const clock = createTimeProvider
    .for(plugin)
    .asFixed()
    .withInitialTime("2026-01-01T00:00Z")
    .create();

  const service = new UserService(clock);

  expect(service.createUser().createdAt).toEqual(clock.utcNow());
});
```

## Clock types

### System clock (default)

```typescript
const clock = createTimeProvider.for(plugin).create();
```

### Fixed clock

Deterministic clock always returning the same instant.

```typescript
const clock = createTimeProvider.for(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create();
```

### Manual clock

Clock that can be advanced explicitly.

```typescript
const clock = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00Z")
  .create();

clock.advance({
  seconds: 5,
});
```

Full example

```typescript
clock.advance({
  years: 1,
  months: 2,
  days: 3,
  hours: 4,
  minutes: 5,
  seconds: 6,
  milliseconds: 7,
});
```

### Sequential clock

Clock that give values from a list of sequential times.

```typescript
const clock = createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:01Z")
  .withSequentialTime("2026-01-01T00:02Z")
  .withSequentialTime("2026-01-01T00:03Z")
  .create();
```

## Installation

```bash
npm install @time-provider/core @time-provider/plugin-temporal
```

## Other adapters

```bash
npm install @time-provider/plugin-native
npm install @time-provider/plugin-dayjs
npm install @time-provider/plugin-luxon
npm install @time-provider/plugin-moment
```

## Core library

| Name                                                                     | NPM package                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [@time-provider/core](https://www.npmjs.com/package/@time-provider/core) | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core) |

## Supported adapters

| Plugin        | Name                                                                                           | Returned Type | NPM package                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Temporal**  | [@time-provider/plugin-temporal](https://www.npmjs.com/package/@time-provider/plugin-temporal) | Instant       | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-temporal.svg)](https://www.npmjs.com/package/@time-provider/plugin-temporal) |
| **Native**    | [@time-provider/plugin-native](https://www.npmjs.com/package/@time-provider/plugin-native)     | Date          | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-native.svg)](https://www.npmjs.com/package/@time-provider/plugin-native)     |
| **Luxon**     | [@time-provider/plugin-luxon](https://www.npmjs.com/package/@time-provider/plugin-luxon)       | DateTime      | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-luxon.svg)](https://www.npmjs.com/package/@time-provider/plugin-luxon)       |
| **Day.js**    | [@time-provider/plugin-dayjs](https://www.npmjs.com/package/@time-provider/plugin-dayjs)       | Dayjs         | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-dayjs.svg)](https://www.npmjs.com/package/@time-provider/plugin-dayjs)       |
| **Moment.js** | [@time-provider/plugin-moment](https://www.npmjs.com/package/@time-provider/plugin-moment)     | Moment        | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-moment.svg)](https://www.npmjs.com/package/@time-provider/plugin-moment)     |

## Use cases

- Testing time-dependent logic (expiration, retries, scheduling)
- Simulating time progression in integration tests
- Decoupling business logic from date libraries
- Running multiple clocks in the same process

## API

```typescript
interface ITimeProvider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
}
```

### Manual clock (adapter)

The core library exposes `ITimeProvider`, while adapters extend it via `ITimeAdapter` to implement library-specific behavior.

```typescript
interface IManualTimeAdapter<TDate> extends ITimeAdapter<TDate> {
  advance(duration: IAdvanceConfiguration): IManualTimeAdapter<TDate>;
}
```

## Architecture

The library is split into:

- `@time-provider/core` provides the core abstraction.
- Each adapter maps the generic API to its native date type.

`time-provider` is date-library agnostic. Adapters are responsible for mapping time operations to the underlying implementation while preserving native return types.

App  
│  
▼  
Library `@time-provider/core`  
│  
├── Temporal adapter `@time-provider/plugin-temporal` ──> Temporal.Instant  
├── Native adapter `@time-provider/plugin-native` ──> Date  
├── Luxon adapter `@time-provider/plugin-luxon` ──> DateTime  
├── Day.js adapter `@time-provider/plugin-dayjs` ──> Dayjs  
└── Moment adapter `@time-provider/plugin-moment` ──> Moment

## License

MIT
