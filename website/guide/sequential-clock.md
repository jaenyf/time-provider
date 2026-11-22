# Sequential Clock

Holds a predefined list of instants, provided via one or more
`.withSequentialTime(...)` calls. Built from
`@time-provider/core/deterministic` — see [Mental Model](/guide/mental-model).
Each call to `clock.utcNow()` / `clock.localNow()` **consumes the next
instant in the list** (once only the last one remains, it keeps returning
that one) — unlike the manual clock, reading time here is itself what
advances it, and any due timer callbacks run
synchronously in-line as a side effect of that same read. Use
`clock.timestampNow()` instead when you only need a value to compute
with — it never consumes an instant or runs callbacks.

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

Each read is a move to the next instant: a backward instant snaps the wall
clock and a forward one flows, firing due timers at their own times.
`withSequentialTime(time, { as })` picks another move — see
[Moving the Clock](/guide/moving-the-clock#sequential-clocks).

## Reads inside timer callbacks

A timer callback that reads the clock consumes an instant too, and that read
moves the clock again, inside the callback, firing more timers. To keep those
reads from moving it, pause time from a callback nesting depth on:

```ts
createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T00:00:00.000Z")
  .withSequentialTime("2026-01-01T00:00:10.000Z")
  .withTimePausedFromDepth(1)
  .create();
```

| Depth                | Which reads consume an instant                                                          |
| -------------------- | --------------------------------------------------------------------------------------- |
| `Infinity` (default) | every read                                                                              |
| `1`                  | only reads made outside any timer callback; a callback reads its own due time           |
| `2`                  | also reads in callbacks fired by such a read, but not reads in the callbacks those fire |

With `1`, a callback that reads the clock during a `sleep` can't make other
overdue intervals catch up, since its read moves nothing.

Use it for tests that assert on a _sequence_ of changing timestamps read
from the same code path (e.g. a function that stamps `createdAt` then
`updatedAt` a moment later) without needing to model elapsed real time the
way [Manual](/guide/manual-clock) does.
