[![CI](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

# Time-Provider

A tiny library to rapidly have time !

## Description

It's a very simple typescript library to setup a source of time.
A time provider works with a compatible adapter (even for native time), so you must both import the core library and the plugin of your choice ([See usage](#Usage)).
Currently supported plugins are :

- **Native time**
- **Dayjs**
- **Moment.js**
- **Luxon**
- **Temporal**

## Usage

- Each plugin (adapter) offers a `TimeAdapter` and a `FixedTimeAdapter` class
- Select your desired plugin (`native/dayjs/moment/luxon/temporal`)
- call `createTimeProvider.for(/*your adapter here*/)`

### For your production code

```typescript
import { createTimeProvider } from "@time-provider/core";
//Import the plugin of your choice (here the native time plugin)
import { TimeAdapter } from "@time-provider/plugin-native";
const timeProvider = createTimeProvider.for(new TimeAdapter());
```

### Or for your tests (fixed time)

```typescript
import { createTimeProvider } from "@time-provider/core";
//Import the plugin of your choice (here the native time plugin)
import { FixedTimeAdapter } from "@time-provider/plugin-native";
const fixedTimeProvider = createTimeProvider.for(
  new FixedTimeAdapter(new Date("2026-01-01T00:00Z")),
);
```

## API

```typescript
interface ITimeProvider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
  parse(input: string | number | TDate): TDate;
}
```

### Plugins information

| Plugin    | Name                           | Returned Type |
| --------- | ------------------------------ | ------------- |
| Native    | @time-provider/plugin-native   | Date          |
| Day.js    | @time-provider/plugin-dayjs    | Dayjs         |
| Moment.js | @time-provider/plugin-moment   | Moment        |
| Luxon     | @time-provider/plugin-luxon    | DateTime      |
| Temporal  | @time-provider/plugin-temporal | Instant       |

## Development

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the development server:

```bash
vp run dev
```
