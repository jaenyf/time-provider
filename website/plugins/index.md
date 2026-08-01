# Plugins (Adapters) — Overview

A plugin adapts one date library to the `ITimeProvider` pipeline. Install
`@time-provider/core` plus exactly one plugin — the one matching the date
type your codebase already uses.

| Plugin                                               | Date type                | Local timezone support          | Peer dependency                    |
| ---------------------------------------------------- | ------------------------ | ------------------------------- | ---------------------------------- |
| [`plugin-native`](/plugins/native)                   | `Date`                   | UTC-only                        | none (built into JS)               |
| [`plugin-dayjs`](/plugins/dayjs)                     | `dayjs.Dayjs`            | ✓ (via `dayjs/plugin/timezone`) | `dayjs`                            |
| [`plugin-luxon`](/plugins/luxon)                     | `DateTime` (Luxon)       | ✓                               | `luxon`                            |
| [`plugin-moment`](/plugins/moment)                   | `moment.Moment`          | UTC-only                        | `moment`                           |
| [`plugin-moment-timezone`](/plugins/moment-timezone) | `moment.Moment`          | ✓ (via `moment-timezone`)       | `moment`, `moment-timezone`        |
| [`plugin-temporal`](/plugins/temporal)               | `Temporal.ZonedDateTime` | ✓                               | none (assumes a global `Temporal`) |

Every plugin exports a ready-to-use singleton named `plugin` — from two
entry points, mirroring `@time-provider/core`'s own split (see
[Mental Model](/guide/mental-model)):

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-dayjs";

const timeProvider = createTimeProvider.for(plugin).create();
```

```ts
// tests
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-dayjs/deterministic";

const timeProvider = createTimeProvider.for(plugin).asFixed().withFixedTime(0).create();
```

`createTimeProvider.for(plugin)` returns a different (but structurally
similar) builder depending on whether the plugin `supportsLocalTime` —
that's what determines whether `.withTimezone(...)` and `clock.localNow()`
exist on the result. See [Timezones & Local Time](/guide/timezones).

Compare all six side-by-side — same expression, different date type — in
the [Playground](/playground).

Want to adapt a date library that isn't listed here? See
[Writing a Custom Plugin](/plugins/custom).
