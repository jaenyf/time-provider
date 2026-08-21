# Sequential Clock

Holds a predefined list of instants, provided via one or more
`.withSequentialTime(...)` calls. Built from
`@time-provider/core/deterministic` — see [Mental Model](/guide/mental-model).
Each call to `clock.utcNow()` / `clock.localNow()` **consumes the next
instant in the list** (once only the last one remains, it keeps returning
that one) — unlike the manual clock, reading time here is itself what
advances it, and any due timers callbacks run
synchronously in-line as a side effect of that same read.

_Note: If the sequence to step through is empty, the resulting clock stays at the Unix epoch._

```ts
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:00:01.000Z")
  .withSequentialTime("2026-01-01T00:00:02.000Z")
  .withSequentialTime("2026-01-01T00:00:03.000Z")
  .create();

timeProvider.clock.utcNow(); // 00:00:01 — first read returns and consumes it
timeProvider.clock.utcNow(); // 00:00:02
timeProvider.clock.utcNow(); // 00:00:03
timeProvider.clock.utcNow(); // 00:00:03 — list exhausted, keeps returning the last instant
```

Use it for tests that assert on a _sequence_ of changing timestamps read
from the same code path (e.g. a function that stamps `createdAt` then
`updatedAt` a moment later) without needing to model elapsed real time the
way [Manual](/guide/manual-clock) does.
