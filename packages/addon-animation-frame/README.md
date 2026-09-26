[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-animation-frame.svg?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
[![jsr](https://img.shields.io/jsr/v/@time-provider/addon-animation-frame?cacheSeconds=86400)](https://jsr.io/@time-provider/addon-animation-frame)
[![jsr score](https://jsr.io/badges/@time-provider/addon-animation-frame/score)](https://jsr.io/@time-provider/addon-animation-frame/score)
[![types](https://img.shields.io/npm/types/@time-provider/addon-animation-frame?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-animation-frame?activeTab=code)
[![Node.js ^18.18 || >=20.4](https://img.shields.io/badge/node-%5E18.18%20%7C%7C%20%3E%3D20.4-blue?logo=node.js&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/package.json)
[![Deno ~1.39.1 || >=1.43](https://img.shields.io/badge/deno-~1.39.1%20%7C%7C%20%3E%3D1.43-blue?logo=deno&logoColor=white&cacheSeconds=86400)](https://jsr.io/@time-provider/addon-animation-frame)
[![module ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue?logo=javascript&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/packages/addon-animation-frame/package.json)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github&cacheSeconds=86400)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-animation-frame?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-animation-frame?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-animation-frame?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Faddon-animation-frame)
[![minified size](https://img.shields.io/bundlejs/size/@time-provider/addon-animation-frame?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Faddon-animation-frame)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-animation-frame?cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Animation Frame API Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the [Animation Frame API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
Extends the library by exposing the animation frame API (`scheduleFrame`) through a dedicated (`scheduler.animation`) facade.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import pulls in only the code it needs:

- `@time-provider/addon-animation-frame` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. `scheduler.animation` passes through to the real
  `requestAnimationFrame`/`cancelAnimationFrame` or throws a clear error otherwise (e.g. plain Node.js, which has no native equivalent).
- `@time-provider/addon-animation-frame/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. `scheduler.animation` is simulated against that
  runtime's own clock.  
  Registered callbacks fires once this runtime's own
  "now" has moved forward by at least one simulated frame duration.

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native";
import { plugin as deterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-animation-frame";
import { addon as deterministicAddon } from "@time-provider/addon-animation-frame/deterministic";

// System: real requestAnimationFrame (or a clear error outside a browser)
const timeProvider = createTimeProvider.for(plugin).use(addon).create();
timeProvider.scheduler.animation.scheduleFrame(() => console.log("Frame!"));

// Deterministic: simulated against the runtime's own clock
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime(0)
  .create();
manual.scheduler.animation.scheduleFrame(() => console.log("Frame!"));
manual.clock.advance({ milliseconds: 20 });
```

You can configure the simulated frame rate by chaining `.withHostFramesRate(...)` on
the builder right after `.use(...)`:

```ts
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .withHostFramesRate(90) //now simulating an animation frame API with 90 FPS
  .asManual()
  .withInitialTime(0)
  .create();
```

## With the compat addon

Compose [`@time-provider/addon-compat`](https://www.npmjs.com/package/@time-provider/addon-compat) **before** this addon and its `.compat` facade also gets `requestAnimationFrame`/`cancelAnimationFrame`, delegating to `scheduleFrame` and to the handle's `dispose()`. They are declared as an optional `compat?` on `WithAnimationFrameApi`, since they are only there when both addons are composed.

## License

MIT
