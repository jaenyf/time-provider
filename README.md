[![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core)
[![CI](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

# [Time-Provider](https://github.com/jaenyf/time-provider)

A tiny typescript library to rapidly have time !

`time-provider` is a single injectable typescript source of time  
→ **System clock** in production  
→ **Deterministic clock** in tests  
with the date library of your choice !

```typescript
// before
const createdAt = new Date();

// after
const createdAt = timeProvider.utcNow();
```

A time provider works with a compatible **adapter** (aka. plugin) (even for [native Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) or [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)), so you must both import the [core library](https://www.npmjs.com/package/@time-provider/core) and the [plugin](#plugins) of your choice ([See usage](#usage)).

## For example

```typescript
const timeProvider = createTimeProvider.for(plugin).create();
/* ... */
const userService = new UserService(timeProvider);
```

## Core library

| Name                                                                     | NPM package                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [@time-provider/core](https://www.npmjs.com/package/@time-provider/core) | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fcore.svg)](https://www.npmjs.com/package/@time-provider/core) |

## Plugins

Currently supported plugins are :

| Plugin        | Name                                                                                           | Returned Type | NPM package                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Temporal**  | [@time-provider/plugin-temporal](https://www.npmjs.com/package/@time-provider/plugin-temporal) | Instant       | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-temporal.svg)](https://www.npmjs.com/package/@time-provider/plugin-temporal) |
| **Native**    | [@time-provider/plugin-native](https://www.npmjs.com/package/@time-provider/plugin-native)     | Date          | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-native.svg)](https://www.npmjs.com/package/@time-provider/plugin-native)     |
| **Luxon**     | [@time-provider/plugin-luxon](https://www.npmjs.com/package/@time-provider/plugin-luxon)       | DateTime      | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-luxon.svg)](https://www.npmjs.com/package/@time-provider/plugin-luxon)       |
| **Day.js**    | [@time-provider/plugin-dayjs](https://www.npmjs.com/package/@time-provider/plugin-dayjs)       | Dayjs         | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-dayjs.svg)](https://www.npmjs.com/package/@time-provider/plugin-dayjs)       |
| **Moment.js** | [@time-provider/plugin-moment](https://www.npmjs.com/package/@time-provider/plugin-moment)     | Moment        | [![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-moment.svg)](https://www.npmjs.com/package/@time-provider/plugin-moment)     |

## Usage

- Each plugin (adapter) exports a `plugin` instance implementing `IPlugin`
- Select your desired plugin (`native/dayjs/moment/luxon/temporal`)
- call `createTimeProvider.for(plugin).create()`

### For your production code

```typescript
import { createTimeProvider } from "@time-provider/core";
//Import the plugin of your choice (here the temporal plugin)
import { plugin } from "@time-provider/plugin-temporal";
import { Temporal } from "@js-temporal/polyfill";
const timeProvider = createTimeProvider.for(plugin).create();
```

### Or for your tests (frozen aka. fixed time)

```typescript
import { createTimeProvider } from "@time-provider/core";
//Import the plugin of your choice (here the temporal plugin)
import { plugin } from "@time-provider/plugin-temporal";
import "@js-temporal/polyfill";
const fixedTimeProvider = createTimeProvider
  .for(plugin)
  .as("fixed")
  .withInitialTime("2026-01-01T00:00Z")
  .create();
```

### For more time control you can use a "manual" TimeProvider (that lets you advance time at your own pace)

```typescript
import { createTimeProvider } from "@time-provider/core";
//Import the plugin of your choice (here the dayjs plugin)
import { plugin } from "@time-provider/plugin-dayjs";
import "dayjs";
import "dayjs/plugin/utc.js";
const manualTimeProvider = createTimeProvider
  .for(plugin)
  .as("manual")
  .withInitialTime("2026-01-01T00:00Z")
  .create();
/* ... */
manualTimeProvider.advance({ seconds: 5 });
```

## API

```typescript
interface ITimeProvider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
}
```
