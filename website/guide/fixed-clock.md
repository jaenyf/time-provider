# Fixed Clock

Always returns the same instant, no matter how many times you read it, and
never advances — so a `setTimeout`/`setInterval` registered against it is
never due, regardless of its delay. Built from
`@time-provider/core/deterministic` — see [Mental Model](/guide/mental-model).

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .asFixed()
  .withFixedTime("2026-01-01T00:00:00.000Z")
  .create();

timeProvider.clock.utcNow(); // always 2026-01-01T00:00:00.000Z
timeProvider.clock.utcNow(); // still 2026-01-01T00:00:00.000Z
```

Use it for tests that assert on a single, deterministic instant and don't
need to exercise timers at all — e.g. "the record's `createdAt` equals
`clock.utcNow()` at creation time." If the code under test schedules
timers you actually need to fire, use [Manual](/guide/manual-clock) or
[Sequential](/guide/sequential-clock) instead.
