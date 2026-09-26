[![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-moment-timezone.svg?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone)
[![types](https://img.shields.io/npm/types/@time-provider/plugin-moment-timezone?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone?activeTab=code)
[![Node.js ^18.18 || >=20.4](https://img.shields.io/badge/node-%5E18.18%20%7C%7C%20%3E%3D20.4-blue?logo=node.js&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/package.json)
[![module ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue?logo=javascript&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-moment-timezone/package.json)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github&cacheSeconds=86400)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/plugin-moment-timezone?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/plugin-moment-timezone?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Fplugin-moment-timezone)
[![minified size](https://img.shields.io/bundlejs/size/@time-provider/plugin-moment-timezone?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Fplugin-moment-timezone)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/plugin-moment-timezone?cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Moment.js (moment-timezone) plugin](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the [Moment.js](https://momentjs.com/) + [Moment-Timezone](https://momentjs.com/timezone/) plugin for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-moment-timezone";
import { plugin as deterministicPlugin } from "@time-provider/plugin-moment-timezone/deterministic";

// System: real clock and timers, in the given timezone.
const timeProvider = createTimeProvider.for(plugin).withTimezone("Europe/Paris").create();
timeProvider.clock.localNow(); // a Moment.js Moment

// Deterministic: a simulated clock that only moves when you advance it.
using manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();
manual.clock.advance({ hours: 1 });
manual.clock.utcNow(); // 2026-01-01T01:00:00.000Z
```

## Changelog

See [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-moment-timezone/CHANGELOG.md)
