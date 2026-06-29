[![CI](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

# Time-Provider

A tiny library to rapidly have time !

## Description

It's a simple typescript library that allows you to handle time providers for both your production codebase and your tests.
A time provider works with a compatible adapter (even for native time), so you must both import the core library and the plugin of your choice ([See usage](#Usage)).
Currently supported plugins are :

- **Native time**
- **Dayjs**
- **Moment.js**
- **Luxon**
- **Temporal**

## Usage

### For your production code

```typescript
//Import the library
import { createTimeProvider } from "@time-provider/time";
//Import the plugin of your choice (here the native time plugin)
import { createTimeAdapter } from "@time-provider/plugin-native";
//And you can now have time
const timeProvider = createTimeProvider(createTimeAdapter());
```

### Or for your tests (fixed time)

```typescript
//Import the library
import { createFixedTimeProvider } from "@time-provider/time";
//Import the plugin of your choice (here the native time plugin)
import { createFixedTimeAdapter } from "@time-provider/plugin-native";
//And you can now take your time on a fixed one of your choice
const fixedTimeProvider = createFixedTimeProvider(createFixedTimeAdapter(new Date("2026-01-01")));
```

## API

```typescript
interface Provider<TDate> {
  localNow(): TDate;
  utcNow(): TDate;
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
