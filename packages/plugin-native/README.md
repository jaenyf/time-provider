[![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-native.svg)](https://www.npmjs.com/package/@time-provider/plugin-native)
[![types](https://img.shields.io/npm/types/@time-provider/plugin-native)](https://www.npmjs.com/package/@time-provider/plugin-native?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/plugin-native)](https://www.npmjs.com/package/@time-provider/plugin-native)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/plugin-native?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/plugin-native)](https://www.npmjs.com/package/@time-provider/plugin-native)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/plugin-native)](https://www.npmjs.com/package/@time-provider/plugin-native)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/plugin-native)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Native plugin](https://github.com/jaenyf/time-provider)

<div align="center">
  <img src="https://raw.githubusercontent.com/jaenyf/time-provider/refs/heads/main/assets/time-provider-logo.svg"  alt="Logo" width="400">
</div>

## Description

This is the native [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) plugin for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Notes

JavaScript's native [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) object lacks a time zone-aware object type that stores and performs arithmetic in a specific time zone.

As a result, [Time-Provider](https://www.npmjs.com/package/@time-provider/core) intentionally does not expose time zone or local-time APIs for `Date`.  
**This plugin provides a UTC-only facade.**

If you need first-class time zone support, consider using [Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) together with the [Time-Provider Temporal plugin](https://www.npmjs.com/package/@time-provider/plugin-temporal).

If you need to keep using the native `Date` object, you can extend it by adding time zone support with the [date-fns](https://www.npmjs.com/package/date-fns) and [date-fns-tz](https://www.npmjs.com/package/date-fns-tz), outside the scope of [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Changelog

See [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-native/CHANGELOG.md)
