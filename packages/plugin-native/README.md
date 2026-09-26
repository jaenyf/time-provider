[![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-native.svg?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-native)
[![types](https://img.shields.io/npm/types/@time-provider/plugin-native?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-native?activeTab=code)
[![Node.js ^18.18 || >=20.4](https://img.shields.io/badge/node-%5E18.18%20%7C%7C%20%3E%3D20.4-blue?logo=node.js&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/package.json)
[![module ESM + CJS](https://img.shields.io/badge/module-ESM%20%2B%20CJS-blue?logo=javascript&logoColor=white&cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-native/package.json)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github&cacheSeconds=86400)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/plugin-native?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-native)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?cacheSeconds=86400)](https://www.npmjs.com/package/@time-provider/plugin-native?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/plugin-native?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Fplugin-native)
[![minified size](https://img.shields.io/bundlejs/size/@time-provider/plugin-native?cacheSeconds=86400)](https://bundlejs.com/?q=%40time-provider%2Fplugin-native)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/plugin-native?cacheSeconds=86400)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Native plugin](https://github.com/jaenyf/time-provider)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://jaenyf.github.io/time-provider/logo-with-text-dark.svg">
    <img alt="Time-Provider" src="https://jaenyf.github.io/time-provider/logo-with-text-light.svg" width="325">
  </picture>
</p>

## Description

This is the native [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) plugin for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Usage

```ts
import { createTimeProvider } from "@time-provider/core";
import { createTimeProvider as createDeterministicTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native";
import { plugin as deterministicPlugin } from "@time-provider/plugin-native/deterministic";

// System: real clock and timers. This plugin is UTC-only.
const timeProvider = createTimeProvider.for(plugin).create();
timeProvider.clock.utcNow(); // a native Date

// Deterministic: a simulated clock that only moves when you advance it.
using manual = createDeterministicTimeProvider
  .for(deterministicPlugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();
manual.clock.advance({ hours: 1 });
manual.clock.utcNow(); // 2026-01-01T01:00:00.000Z
```

## Notes

JavaScript's native [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object lacks a time zone-aware object type that stores and performs arithmetic in a specific time zone.

As a result, [Time-Provider](https://www.npmjs.com/package/@time-provider/core) intentionally does not expose time zone or local-time APIs for `Date`.  
**This plugin provides a UTC-only facade.**

If you need first-class time zone support, consider using [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) together with the [Time-Provider Temporal plugin](https://www.npmjs.com/package/@time-provider/plugin-temporal).

If you need to keep using the native `Date` object, you can extend it by adding time zone support with the [date-fns](https://www.npmjs.com/package/date-fns) and [date-fns-tz](https://www.npmjs.com/package/date-fns-tz), outside the scope of [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Changelog

See [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-native/CHANGELOG.md)
