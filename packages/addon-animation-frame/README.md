[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-animation-frame.svg)](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
[![types](https://img.shields.io/npm/types/@time-provider/addon-animation-frame)](https://www.npmjs.com/package/@time-provider/addon-animation-frame?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-animation-frame)](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/addon-animation-frame?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-animation-frame)](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/addon-animation-frame)](https://www.npmjs.com/package/@time-provider/addon-animation-frame)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-animation-frame)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Animation Frame API Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/jaenyf/time-provider/refs/heads/main/assets/time-provider-logo-dark.svg">
    <img alt="Time-Provider" src="https://raw.githubusercontent.com/jaenyf/time-provider/refs/heads/main/assets/time-provider-logo-light.svg" width="325">
  </picture>
</p>

## Description

This is the [Animation Frame API](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
Extends the library by exposing the animation frame API (`requestAnimationFrame`/`cancelAnimationFrame`) through a dedicated (`.animation`) facade.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import pulls in only the code it needs:

- `@time-provider/addon-animation-frame` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. `.animation` passes through to the real
  `requestAnimationFrame`/`cancelAnimationFrame` or throws a clear error otherwise (e.g. plain Node.js, which has no native equivalent).
- `@time-provider/addon-animation-frame/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. `.animation` is simulated against that
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
timeProvider.animation.requestAnimationFrame(() => console.log("Frame!"));

// Deterministic: simulated against the runtime's own clock
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime(0)
  .create();
manual.animation.requestAnimationFrame(() => console.log("Frame!"));
manual.clock.advance({ milliseconds: 20 });
```

You can configure the simulated frame rate by chaining `.withHostFramesRate(...)` on
the builder right after `.use(...)`:

```ts
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .withHostFramesRate(90) //now simulating an amination frame API with 90 FPS
  .asManual()
  .withInitialTime(0)
  .create();
```

## License

MIT
