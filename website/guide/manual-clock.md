# Manual Clock

Starts at `withInitialTime(...)` and only moves when you call
`clock.moveBy(...)` or `clock.moveTo(...)` — reading `utcNow()`/`localNow()` never changes it.
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
using handle = timeProvider.scheduler.timers.every({ seconds: 1 }, () => retries++);

timeProvider.clock.moveBy({ seconds: 3 });
retries; // 3 — three 1s ticks fit in a 3s move, run synchronously in-line

timeProvider.clock.moveBy({ hours: 1, minutes: 30 });
```

`moveBy()` accepts any combination of `years`, `months`, `days`, `hours`,
`minutes`, `seconds`, `milliseconds`. When more than one is set, they're
applied to the current time in that fixed order — this matters because
combining calendar-variable elements (`years`, `months`) with others can
give a different result depending on application order.

If timers backed by this clock have pending timer callbacks, any that become due
as a result of `moveBy()` run **synchronously, in-line**, before
`moveBy()` returns — see [Deterministic Timers](/guide/timers). A
repeating interval whose delay is smaller than the elapsed time re-fires
as many times as fit, matching how a real interval behaves when the event
loop was blocked past a firing.

To step only the wall clock, simulate a suspend, or run pending timers one by
one, see [Moving the Clock](/guide/moving-the-clock). `advance()` still works
and is deprecated in favour of `moveBy()`.

Use it for simulations and for testing timer/retry logic where you control
exactly how far time moves and when.
