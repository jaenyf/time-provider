[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-idle.svg)](https://www.npmjs.com/package/@time-provider/addon-idle)
[![types](https://img.shields.io/npm/types/@time-provider/addon-idle)](https://www.npmjs.com/package/@time-provider/addon-idle?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-idle)](https://www.npmjs.com/package/@time-provider/addon-idle)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/addon-idle?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-idle)](https://www.npmjs.com/package/@time-provider/addon-idle)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/addon-idle)](https://www.npmjs.com/package/@time-provider/addon-idle)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-idle)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Idle Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the [Idle](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
It adds an `.idle` facade exposing the idle callback API (`requestIdleCallback`/`cancelIdleCallback`), alongside the existing `.clock`, `.scheduler`, `.parser` and `.performance` ones.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import pulls in only the code it needs:

- `@time-provider/addon-idle` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. `.idle` passes through to the real
  `requestIdleCallback`/`cancelIdleCallback`, or throws a clear error when the host has no native
  equivalent (e.g. Safari).
- `@time-provider/addon-idle/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. `.idle` is simulated against that
  runtime's own clock.

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native";
import { plugin as deterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-idle";
import { addon as deterministicAddon } from "@time-provider/addon-idle/deterministic";

// System: real requestIdleCallback (or a clear error if not available)
const timeProvider = createTimeProvider.for(plugin).use(addon).create();
timeProvider.idle.requestIdleCallback(() => console.log("Idle!"));

// Deterministic: simulated against the runtime's own clock
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime(0)
  .create();
manual.idle.requestIdleCallback(() => console.log("Idle!"));
manual.clock.advance({ milliseconds: 1 }); // the idle callback runs here
```

### Simulated idle periods

There is no such thing as a real idle period on a deterministic runtime, so an idle callback is
scheduled on the runtime's own clock instead: it fires once "now" has moved forward by the
simulated idle delay. That delay defaults to **1ms**, which keeps idle work behind whatever is
already due at the current instant - a deterministic runtime drains a 0ms delay in-line, so a 0
default would run the callback synchronously from `requestIdleCallback` itself.

`.withIdleDelay(ms)` is contributed by the deterministic addon and chains directly off
`.use(addon)`, before you pick a strategy. Raise it to push idle work further out, behind the
timeouts the code under test schedules:

```ts
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .withIdleDelay(100)
  .asManual()
  .withInitialTime(0)
  .create();

manual.scheduler.setTimeout(() => console.log("Busy!"), 50);
manual.idle.requestIdleCallback(() => console.log("Idle!"));
manual.clock.advance({ milliseconds: 50 }); // "Busy!"
manual.clock.advance({ milliseconds: 50 }); // "Idle!"
```

## License

MIT
