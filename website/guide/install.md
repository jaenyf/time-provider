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
- your custom adapter for any other cases

Each plugin depends only on `@time-provider/core` and its own date library
(a peer dependency) — see [Plugins](/plugins/) for which one fits your
codebase, and which support real IANA timezones vs. UTC-only.

Want to extend a Time-Provider with extra functionality instead of a new
date library? See [Addons](/addons/) — e.g.
[`@time-provider/addon-animation-frame`](https://www.npmjs.com/package/@time-provider/addon-animation-frame).

## Requirements

- Node.js `^18.18.0 || >= 20.4.0` (the releases exposing `Symbol.dispose`,
  which `using` relies on), or any modern browser/bundler target.
- Deno `~1.39.1 || >= 1.43` when installing from
  [JSR](https://jsr.io/@time-provider). 1.39.1 is the first release that
  resolves JSR package exports, and `deno check --all` needs 1.43, which is
  where an older Deno bug on branded types was fixed.
- TypeScript is optional. To use the types: 5.2 or later, with
  `esnext.disposable` (or `esnext`) in `lib`, or `@types/node`.
  `@time-provider/addon-cron` needs 5.4. `@time-provider/plugin-temporal`
  needs 6.0 with `esnext.temporal` in `lib`, or 5.2 with your own global
  `Temporal` types.
- JavaScript: ES2022, as ESM or CommonJS.

## Package layout

```
@time-provider/core                    abstractions, base classes, the builders
@time-provider/plugin-native           native javascript Date (UTC-only)
@time-provider/plugin-dayjs            Day.js
@time-provider/plugin-luxon            Luxon
@time-provider/plugin-moment           Moment.js (UTC-only)
@time-provider/plugin-moment-timezone  Moment.js + moment-timezone
@time-provider/plugin-temporal         Temporal (via @js-temporal/polyfill until native)
@time-provider/addon-animation-frame   Animation Frame API addon (scheduleFrame)
@time-provider/addon-cron              Cron scheduling addon (standard 5-field cron expressions)
@time-provider/addon-eta               ETA estimation addon (progress-based and fixed-duration completion estimates)
@time-provider/addon-idle              Idle callback addon (request, drained on demand on a deterministic clock)
@time-provider/addon-compat            Compatibility addon (native-style setTimeout/setInterval/queueMicrotask/performance signatures)
```
