[![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-temporal.svg)](https://www.npmjs.com/package/@time-provider/plugin-temporal)
[![types](https://img.shields.io/npm/types/@time-provider/plugin-temporal)](https://www.npmjs.com/package/@time-provider/plugin-temporal?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/plugin-temporal)](https://www.npmjs.com/package/@time-provider/plugin-temporal)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/plugin-temporal?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/plugin-temporal)](https://www.npmjs.com/package/@time-provider/plugin-temporal)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/plugin-temporal)](https://www.npmjs.com/package/@time-provider/plugin-temporal)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/plugin-temporal)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Temporal plugin](https://github.com/jaenyf/time-provider)

<div align="center">
  <img src="https://raw.githubusercontent.com/jaenyf/time-provider/refs/heads/main/assets/time-provider-logo.svg"  alt="Logo" width="400">
</div>

## Description

This is the [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) plugin for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Notes

This plugin assumes a global `Temporal` namespace is already available.

As of now, [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) is a [TC39 proposal](https://tc39.es/proposal-temporal/docs/) expected to eventually become a native JavaScript global. Until every environment you target ships it, load a `Temporal` implementation yourself before using this plugin.

For example, with [`@js-temporal/polyfill`](https://www.npmjs.com/package/@js-temporal/polyfill):

```typescript
import { Temporal } from "@js-temporal/polyfill";
if (!("Temporal" in globalThis)) {
  (globalThis as { Temporal?: unknown }).Temporal = Temporal;
}
```

## Changelog

See [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-temporal/CHANGELOG.md)
