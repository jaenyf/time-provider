# Manual Clock

Starts at `withInitialTime(...)` and only moves when you call
`clock.advance(...)` — reading `utcNow()`/`localNow()` never changes it.
Built from `@time-provider/core/deterministic` — see
[Mental Model](/guide/mental-model).

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

using timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();

let retries = 0;
using handle = timeProvider.timers.every({ seconds: 1 }, () => retries++);

timeProvider.clock.advance({ seconds: 3 });
retries; // 3 — three 1s ticks fit in a 3s advance, run synchronously in-line

timeProvider.clock.advance({ hours: 1, minutes: 30 });
```

`advance()` accepts any combination of `years`, `months`, `days`, `hours`,
`minutes`, `seconds`, `milliseconds`. When more than one is set, they're
applied to the current time in that fixed order — this matters because
combining calendar-variable elements (`years`, `months`) with others can
give a different result depending on application order.

If a scheduler backed by this clock has pending timers, any that become due
as a result of `advance()` run **synchronously, in-line**, before
`advance()` returns — see [Deterministic Timers](/guide/timers). A
repeating interval whose delay is smaller than the elapsed advance re-fires
as many times as fit, matching how a real interval behaves when the event
loop was blocked past a firing.

Use it for simulations and for testing timer/retry logic where you control
exactly how far time moves and when.
