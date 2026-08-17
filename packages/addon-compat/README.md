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

# [Time-Provider ~ Compatibility Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the compatibility addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
Extends the library with a `.compat` facade that exposes low-level-like methods signatures.
This is usefull if you want to migrate your codebase to TimeProvider while keeping your native low-level methods signatures.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import pulls in only the code it needs:

- `@time-provider/addon-compat` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. Timers run on real native timers.
- `@time-provider/addon-compat/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. Timers run against that runtime's own simulated clock.

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native";
import { plugin as deterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-compat";
import { addon as deterministicAddon } from "@time-provider/addon-compat/deterministic";

// System: runs on real native timers, in the runtime's local timezone.
const timeProvider = createTimeProvider.for(plugin).use(addon).create();
const handle = timeProvider.compat.timers.setTimeout(() => {
  console.info("Native setTimeout call style");
}, 500);
// ...
timeProvider.compat.timers.clearTimeout(handle);
//same calls for setInterval/clearInterval, setRecurring/clearRecurring...

// Deterministic: runs against the runtime's own simulated clock.
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime("2024-01-01T00:00:00.000Z")
  .create();
const handle = manual.compat.timers.setTimeout(() => {
  console.info("Native setTimeout call style");
}, 500);
// ...
manual.compat.timers.clearTimeout(handle);
//same calls for setInterval/clearInterval, setRecurring/clearRecurring...
```

## License

MIT
