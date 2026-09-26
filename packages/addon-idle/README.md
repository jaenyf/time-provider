[![NPM](https://img.shields.io/npm/v/@time-provider%2Faddon-idle.svg?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-idle)
[![jsr](https://img.shields.io/jsr/v/@time-provider/addon-idle?cacheSeconds=86400)](https://jsr.io/@time-provider/addon-idle)
[![jsr score](https://jsr.io/badges/@time-provider/addon-idle/score)](https://jsr.io/@time-provider/addon-idle/score)
[![types](https://img.shields.io/npm/types/@time-provider/addon-idle?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-idle?activeTab=code)
[![Node.js ^18.18 || >=20.4](https://img.shields.io/badge/node-%5E18.18%20%7C%7C%20%3E%3D20.4-blue?logo=node.js&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/package.json)
[![Deno ~1.39.1 || >=1.43](https://img.shields.io/badge/deno-~1.39.1%20%7C%7C%20%3E%3D1.43-blue?logo=deno&logoColor=white&cacheSeconds=86400)](https://jsr.io/@time-provider/addon-idle)
[![module ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue?logo=javascript&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/packages/addon-idle/package.json)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github&cacheSeconds=86400)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/addon-idle?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-idle)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/addon-idle?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/addon-idle?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Faddon-idle)
[![minified size](https://img.shields.io/bundlejs/size/@time-provider/addon-idle?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Faddon-idle)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/addon-idle?cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Idle Addon](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the [Idle](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback) addon for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).  
It adds a `scheduler.idle` facade exposing the idle callback API (`request`, cancelled via `dispose()` on the returned handle), beside the `scheduler.timers` and `scheduler.microtasks` that core already provides.

Just like the plugin packages, this addon is tree-shakable.  
It is split into a default (system/real-time) entry point and a deterministic one, so each import pulls in only the code it needs:

- `@time-provider/addon-idle` - for a **system** (real time) Time-Provider
  created via `@time-provider/core`. `.scheduler.idle.request` passes through to the real
  `requestIdleCallback`, or throws a clear error when the host has no native equivalent (e.g.
  Safari) - `cancelIdleCallback` itself stays an internal detail; cancel by calling `dispose()` on
  the handle `.scheduler.idle.request` returns.
- `@time-provider/addon-idle/deterministic` - for a **deterministic**
  Time-Provider (fixed/manual/sequential) created via
  `@time-provider/core/deterministic`. Requests made through `.scheduler.idle.request` stay
  pending until a test declares the runtime idle via `.scheduler.idle.drain()`.

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native";
import { plugin as deterministicPlugin } from "@time-provider/plugin-native/deterministic";
import { addon } from "@time-provider/addon-idle";
import { addon as deterministicAddon } from "@time-provider/addon-idle/deterministic";

// System: real requestIdleCallback under the hood (or a clear error if not available)
const timeProvider = createTimeProvider.for(plugin).use(addon).create();
timeProvider.scheduler.idle.request(() => console.log("Idle!"));

// Deterministic: requests stay pending until you declare the runtime idle
const manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .use(deterministicAddon)
  .asManual()
  .withInitialTime(0)
  .create();
manual.scheduler.idle.request(() => console.log("Idle!"));
manual.scheduler.idle.drain(); // the idle callback runs here
```

### Simulated idle periods

There is no such thing as a real idle period on a deterministic runtime - unlike a timeout,
nothing about elapsed simulated time says the runtime has spare capacity - so `request()` just
registers the callback under this addon's own tag in the runtime's shared due-heap. `advance()`/
clock reads never fire it on their own; only `drain()` does, by retrieving up to `maxCount`
pending requests (oldest first) directly through that tag - without scanning any other pending
timer/interval/recurring entry sharing the heap:

```ts
manual.scheduler.timers.once({ milliseconds: 50 }, () => console.log("Busy!"));
manual.scheduler.idle.request(() => console.log("Idle!"));
manual.clock.advance({ milliseconds: 50 }); // "Busy!" - the idle request is still pending
manual.scheduler.idle.drain(); // "Idle!"
```

Omit `maxCount` to run everything currently pending, or pass it to cap how much idle work a
single idle period allows through:

```ts
manual.scheduler.idle.request(() => console.log("first"));
manual.scheduler.idle.request(() => console.log("second"));
manual.scheduler.idle.drain(1); // "first" - "second" stays pending for the next drain
```

## With the compat addon

Compose [`@time-provider/addon-compat`](https://www.npmjs.com/package/@time-provider/addon-compat) **before** this addon and its `.compat` facade also gets `requestIdleCallback`/`cancelIdleCallback`, delegating to `request` and to the handle's `dispose()`. They are declared as an optional `compat?` on `WithIdleApi`, since they are only there when both addons are composed.

## License

MIT
