[![CI](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)

# Time-Provider

A library to rapidly have time !

## Description

This is for now a simple library that allows you to handle time providers for both your production codebase and your tests.
The time provider works with any compatible adapter (even for native time), so you must both import the core library and the plugin of your choice.
Supported plugins are for now :

- **Native time**
- **Dayjs**
- **Moment.js**
- **Luxon**
- **Temporal**

## Usage

```typescript
//Import the library
import { createTimeProvider } from "@time-provider/time";
//Import the plugin of your choice (here the native time plugin)
import { createTimeAdapter } from "@time-provider/plugin-native";
//And you can now have time
const timeProvider = createTimeProvider(createTimeAdapter());
```

### And for your tests

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

### TDate types per plugin

| Plugin    | TDate    |
| --------- | -------- |
| Native    | Date     |
| Day.js    | Dayjs    |
| Moment.js | Moment   |
| Luxon     | DateTime |
| Temporal  | Instant  |

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
