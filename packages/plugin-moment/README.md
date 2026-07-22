[![NPM](https://img.shields.io/npm/v/@time-provider%2Fplugin-moment.svg)](https://www.npmjs.com/package/@time-provider/plugin-moment)
[![types](https://img.shields.io/npm/types/@time-provider/plugin-moment)](https://www.npmjs.com/package/@time-provider/plugin-moment?activeTab=code)
[![CodeQL](https://img.shields.io/badge/CodeQL-enabled-blue?logo=github)](https://github.com/jaenyf/time-provider)
[![check](https://github.com/jaenyf/time-provider/actions/workflows/check.yml/badge.svg)](https://github.com/jaenyf/time-provider/actions/workflows/check.yml)
[![codecov](https://codecov.io/gh/jaenyf/time-provider/graph/badge.svg)](https://codecov.io/gh/jaenyf/time-provider)
[![npm downloads](https://img.shields.io/npm/dm/@time-provider/plugin-moment)](https://www.npmjs.com/package/@time-provider/plugin-moment)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)](https://www.npmjs.com/package/@time-provider/plugin-moment?activeTab=dependencies)
[![unpacked-size](https://img.shields.io/npm/unpacked-size/@time-provider/plugin-moment)](https://www.npmjs.com/package/@time-provider/plugin-moment)
[![minzipped size](https://img.shields.io/bundlephobia/minzip/@time-provider/plugin-moment)](https://www.npmjs.com/package/@time-provider/plugin-moment)
[![openssf best practices](https://www.bestpractices.dev/projects/13697/badge)](https://www.bestpractices.dev/en/projects/13697)
[![license](https://img.shields.io/npm/l/@time-provider/plugin-moment)](https://github.com/jaenyf/time-provider/blob/main/LICENSE)

# [Time-Provider ~ Moment.js plugin](https://github.com/jaenyf/time-provider)

<div align="center">
  <img src="https://raw.githubusercontent.com/jaenyf/time-provider/refs/heads/main/assets/time-provider-logo.svg"  alt="Logo" width="400">
</div>

## Description

This is the [Moment.js](https://momentjs.com/) plugin for [Time-Provider](https://www.npmjs.com/package/@time-provider/core).

## Notes

When used **without** the [Moment-Timezone](https://momentjs.com/timezone/) extension, [Moment.js](https://momentjs.com/) does not provide support for IANA time zones or daylight saving time (DST)-aware time zone conversions.

As a result, [Time-Provider](https://www.npmjs.com/package/@time-provider/core) intentionally does not expose time zone or local-time APIs for `Moment`.  
**This plugin provides a UTC-only facade.**

If you need true local time or first-class time zone support, consider extending [Moment.js](https://momentjs.com/) with [Moment-Timezone](https://momentjs.com/timezone/) and using the [Time-Provider Moment-Timezone plugin](https://www.npmjs.com/package/@time-provider/plugin-moment-timezone).

## Changelog

See [CHANGELOG.md](https://github.com/jaenyf/time-provider/blob/main/packages/plugin-moment/CHANGELOG.md)
