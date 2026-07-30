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

## Description

Extends the library by exposing a `requestAnimationFrame`/`cancelAnimationFrame` through a new (`.animation`) facade.

Just like the plugin packages, this addon is split into a system entry point and a
deterministic entry point, so each import pulls in only the code it needs:

- `@time-provider/addon-animation-frame` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. `.animation` passes through to the real
  `requestAnimationFrame`/`cancelAnimationFrame` when available (e.g. a
  browser), and throws a clear error otherwise (e.g. plain Node.js, which has
  no native equivalent).
- `@time-provider/addon-animation-frame/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. `.animation` is simulated against that
  runtime's own clock: a registered callback fires once this runtime's own
  "now" has moved forward by at least one simulated frame duration (defaults
  to 60hz, i.e. ~16.67ms) - matching the native contract of firing exactly
  once per call, not repeatedly like `setInterval`.

A bundle that only composes the system addon never pulls in the deterministic
scheduler (or vice versa) - each entry point only references its own code.

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
timeProvider.animation.requestAnimationFrame(() => console.log("frame"));

// Deterministic: simulated against the runtime's own clock
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime(0)
  .create();
manual.animation.requestAnimationFrame(() => console.log("frame"));
manual.clock.advance({ milliseconds: 20 });
```

Configure the simulated frame rate with
`createAnimationFrameAddon({ hostFramesRate: 90 })` (from
`@time-provider/addon-animation-frame/deterministic`) instead of the default
`animationFrameAddon` export - the system entry point's
`createAnimationFrameAddon()` takes no options, since the real
`requestAnimationFrame` rate is up to the host display.

## License

MIT
