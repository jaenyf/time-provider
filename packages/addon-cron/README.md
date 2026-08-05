[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-cron.svg)](https://www.npmjs.com/package/@time-provider/addon-cron)
[![types](https://img.shields.io/npm/types/@time-provider/addon-cron)](https://www.npmjs.com/package/@time-provider/addon-cron?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-cron)](https://www.npmjs.com/package/@time-provider/addon-cron)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/addon-cron?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-cron)](https://www.npmjs.com/package/@time-provider/addon-cron)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/addon-cron)](https://www.npmjs.com/package/@time-provider/addon-cron)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-cron)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Cron Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the cron scheduling addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
Extends the library with a `.cron` facade that runs a callback on a schedule described by a
standard 5-field cron expression (`minute hour day-of-month month day-of-week`), evaluated in the
runtime's own local timezone.

The expression parser and next-occurrence calculator are hand-rolled, with zero runtime
dependencies. It supports `*`, single values, `a-b` ranges, `.../n` steps and comma-separated
lists on every field, the usual 3-letter month/day names (`JAN`-`DEC`, `SUN`-`SAT`,
case-insensitive), the `7` Sunday alias, and the POSIX quirk where a match on either
day-of-month or day-of-week counts when both are restricted. It does not support seconds, or the
`L`/`W`/`#` special characters some cron implementations add.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import pulls in only the code it needs:

- `@time-provider/addon-cron` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. Schedules run on real native timers.
- `@time-provider/addon-cron/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. Schedules run against that runtime's own
  simulated clock.

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native";
import { plugin as deterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-cron";
import { addon as deterministicAddon } from "@time-provider/addon-cron/deterministic";

// System: runs on real native timers, in the runtime's local timezone.
const timeProvider = createTimeProvider
  .for(plugin)
  .use(addon)
  .withTimezone("Europe/Paris")
  .create();
const handle = timeProvider.cron.schedule("0 9 * * MON-FRI", () => console.log("Good morning!"));
// ...
timeProvider.cron.unschedule(handle);

// Deterministic: runs against the runtime's own simulated clock.
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime("2024-01-01T00:00:00.000Z")
  .create();
manual.cron.schedule("*/15 * * * *", () => console.log("Every 15 minutes"));
manual.clock.advance({ minutes: 15 });
```

## JSON schedules

`schedule` also accepts a JSON `ICronSpec` instead of a cron expression string, for callers who'd
rather avoid the positional/symbolic syntax. Each field (`minute`, `hour`, `dayOfMonth`, `month`,
`dayOfWeek`) defaults to every value when omitted, and otherwise accepts a number, a numeric
string (e.g. `"9"`), a name (e.g. `"JAN"`, `"MON"`), a `{ from, to, step? }` range, or an array
mixing any of those. `month` and `dayOfWeek` only accept their own names - giving a day-of-week
name to `hour`, or a month name to `dayOfWeek`, is a compile-time type error, not just a runtime
one:

```ts
timeProvider.cron.schedule({ hour: 9, dayOfWeek: ["MON", "WED", "FRI"] }, () =>
  console.log("Good morning!"),
);

timeProvider.cron.schedule({ minute: { from: 0, to: 45, step: 15 } }, () =>
  console.log("Every 15 minutes"),
);
```

## Timezones and callbacks that throw

Schedules are read in the runtime's own local timezone, captured when `schedule()` is called - so
a schedule created after `clock.withTimezone(...)` uses the new timezone, while one already
running keeps the timezone it started with. Wall-clock times that a DST transition skips resolve
to the first instant past the gap, and ones it repeats resolve to the earlier of the two.

A cron callback is an ordinary scheduler callback, so one that throws follows the runtime's usual
rule (see `IScheduler`): the exception propagates in a Node-like environment, and is logged in a
browser-like one. Either way that schedule stops, exactly as a `setRecurring` callback that throws
does - catch inside your own callback if a failing run shouldn't end the job.

## License

MIT
