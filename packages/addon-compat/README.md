[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-compat.svg?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-compat)
[![types](https://img.shields.io/npm/types/@time-provider/addon-compat?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-compat?activeTab=code)
[![Node.js ^18.18 || >=20.4](https://img.shields.io/badge/node-%5E18.18%20%7C%7C%20%3E%3D20.4-blue?logo=node.js&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/package.json)
[![module ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue?logo=javascript&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/packages/addon-compat/package.json)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github&cacheSeconds=86400)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-compat?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-compat)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?cacheSeconds=86400](https://www.npmjs.com/package/@time-provider/addon-compat?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-compat?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Faddon-compat)
[![minified size](https://img.shields.io/bundlejs/size/@time-provider/addon-compat?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Faddon-compat)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-compat?cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Compatibility Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the compatibility addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
Extends the library with a `.compat` facade that exposes low-level-like methods signatures - the native-style timer calls and the `performance` members, flat on the same object.
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
const handle = timeProvider.compat.setTimeout(() => {
  console.info("Native setTimeout call style");
}, 500);
// ...
timeProvider.compat.clearTimeout(handle);
//same calls for setInterval/clearInterval...

timeProvider.compat.queueMicrotask(() => {
  console.info("Native queueMicrotask call style");
});

// The performance members are there too, with their native signatures.
timeProvider.compat.mark("request-start");
console.info(timeProvider.compat.now(), timeProvider.compat.timeOrigin);

// Deterministic: runs against the runtime's own simulated clock.
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime("2024-01-01T00:00:00.000Z")
  .create();
const handle = manual.compat.setTimeout(() => {
  console.info("Native setTimeout call style");
}, 500);
// ...
manual.compat.clearTimeout(handle);
//same calls for setInterval/clearInterval...
```

## Members other addons add

Composing `@time-provider/addon-animation-frame` or `@time-provider/addon-idle` **after** this addon adds their native-shaped aliases to the same `.compat` facade: `requestAnimationFrame`/`cancelAnimationFrame` and `requestIdleCallback`/`cancelIdleCallback`. Each `cancel*` takes the handle its `request*` returned. Compose this addon first - the facade has to exist by the time they are applied, and composed the other way round the aliases are simply absent.

## License

MIT
