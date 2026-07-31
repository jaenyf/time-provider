# Install

Install the core package plus exactly one plugin — the adapter matching the
date library your codebase already uses:

```bash
npm install @time-provider/core @time-provider/plugin-native
```

Swap `plugin-native` for one of:

- `@time-provider/plugin-dayjs`
- `@time-provider/plugin-luxon`
- `@time-provider/plugin-moment`
- `@time-provider/plugin-moment-timezone`
- `@time-provider/plugin-temporal`

Each plugin depends only on `@time-provider/core` and its own date library
(a peer dependency) — see [Plugins](/plugins/) for which one fits your
codebase, and which support real IANA timezones vs. UTC-only.

Every package — `core` and each plugin — ships **two entry points**: the
default one (`@time-provider/core`, `@time-provider/plugin-dayjs`, ...) for a
production, system (real time) Time-Provider, and a `/deterministic`
subpath (`@time-provider/core/deterministic`,
`@time-provider/plugin-dayjs/deterministic`, ...) for the fixed/manual/sequential
strategies used in tests. See [Mental Model](/guide/mental-model) for why
they're split, and [Quick Start](/guide/quick-start) for both in use.

Want to extend a Time-Provider with extra functionality instead of a new
date library? See [Addons](/guide/addons) — e.g.
[`@time-provider/addon-animation-frame`](https://www.npmjs.com/package/@time-provider/addon-animation-frame).

## Requirements

- Node.js `>= 22.12.0`, or any modern browser/bundler target.
- TypeScript is not required, but every type is exported and the whole
  library is written in it.

## Package layout

```
@time-provider/core                    abstractions, base classes, the builders
@time-provider/plugin-native           native Date (UTC-only)
@time-provider/plugin-dayjs            Day.js
@time-provider/plugin-luxon            Luxon
@time-provider/plugin-moment           Moment.js (UTC-only)
@time-provider/plugin-moment-timezone  Moment.js + moment-timezone
@time-provider/plugin-temporal         Temporal (via @js-temporal/polyfill until native)
@time-provider/addon-animation-frame   Animation Frame API addon (requestAnimationFrame/cancelAnimationFrame)
```
