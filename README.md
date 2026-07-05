# Time-Provider

**Inject time without committing to a date library.**

[![CodecovApp](https://github.com/codecov/engineering-team/assets/152432831/e90313f4-9d3a-4b63-8b54-cfe14e7ec20d)](https://codecov.io/gh/jaenyf/time-provider)
[![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core)
[![CI](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

A TypeScript library providing **injectable clocks** with adapters for multiple date libraries.

Supported adapters:

- Native `Date`
- `Temporal`
- `Day.js`
- `Luxon`
- `Moment.js`

---

## Overview

`Time-Provider` exposes a clock abstraction that can be swapped depending on runtime context:

- system clock (production)
- fixed clock (tests)
- manual clock (controlled time progression)

It is designed to remain **agnostic of the underlying date library**.

---

## Quick start

```typescript
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-temporal";

const clock = createTimeProvider.for(plugin).create();

console.log(clock.utcNow());
```

## Usage

### Injection example

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

## Clock types

### System clock (default)

```typescript
const clock = createTimeProvider.for(plugin).create();
```

## Fixed clock

Deterministic clock always returning the same instant.

```typescript
const clock = createTimeProvider
  .for(plugin)
  .as("fixed")
  .withInitialTime("2026-01-01T00:00Z")
  .create();
```

## Manual clock

Clock that can be advanced explicitly.

```typescript
const clock = createTimeProvider
  .for(plugin)
  .as("manual")
  .withInitialTime("2026-01-01T00:00Z")
  .create();

clock.advance({
  seconds: 5,
});
```

Full example:

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

## Fake timers

Fake timers mutate global runtime behavior.

`Time-Provider` uses explicit dependency injection instead of global state, allowing multiple clock implementations to coexist safely within the same process.

## API

```typescript
interface ITimeProvider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
}
```

Manual clock

```typescript
interface IManualTimeAdapter<TDate> extends ITimeAdapter<TDate> {
  advance(duration: IAdvanceConfiguration): IManualTimeAdapter<TDate>;
}
```

## Architecture

The library is split into:

`@time-provider/core`
adapter packages per date library

Core logic is date-library agnostic. Adapters are responsible for mapping time operations to the underlying implementation while preserving native return types.

App  
│  
▼  
Time-Provider (core)  
│  
├── Temporal adapter ──> Temporal.Instant  
├── Native adapter ──> Date  
├── Luxon adapter ──> DateTime  
├── Dayjs adapter ──> Dayjs  
└── Moment adapter ──> Moment

## License

MIT
