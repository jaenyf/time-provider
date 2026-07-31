# Clock Strategies — Overview

Every strategy produces the same `ITimeProvider<TDate>` shape — only how
`clock.utcNow()`/`clock.localNow()` computes "now", and whether the
scheduler's timers fire synchronously, changes. System comes from
`createTimeProvider.for(plugin)` in `@time-provider/core`; Fixed, Manual,
and Sequential come from the same call in `@time-provider/core/deterministic`
— see [Mental Model](/guide/mental-model) for why they're split.

| Strategy                              | "now" comes from                      | Timers fire                                      | Typical use                            |
| ------------------------------------- | ------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| [System](/guide/system-clock)         | the real system clock                 | asynchronously, via real native timers           | Production                             |
| [Fixed](/guide/fixed-clock)           | a single instant, forever             | never (time never advances)                      | Deterministic single-instant tests     |
| [Manual](/guide/manual-clock)         | the last value set via `advance()`    | synchronously, in-line, when advanced due        | Simulations, timer/retry logic tests   |
| [Sequential](/guide/sequential-clock) | the next instant in a predefined list | synchronously, in-line, as instants are consumed | Tests asserting on changing timestamps |

```ts
// production
import { createTimeProvider } from "@time-provider/core";
import { plugin } from "@time-provider/plugin-native";

createTimeProvider.for(plugin).create(); // system (the only strategy this entry point builds)
```

```ts
// tests
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

createTimeProvider.for(plugin).asFixed().withFixedTime("2026-01-01T00:00Z").create();
createTimeProvider.for(plugin).asManual().withInitialTime("2026-01-01T00:00Z").create();
createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:01Z")
  .withSequentialTime("2026-01-01T00:02Z")
  .create();
```

Every builder (including the system one) accepts `.withTimezone(tz)` /
`.withHostTimezone()` / `.withDefaultTimezone()` before `.create()`, for
plugins whose date library supports real local time — see
[Timezones & Local Time](/guide/timezones).

Play with each strategy interactively in the [Playground](/playground).
