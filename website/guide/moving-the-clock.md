# Moving the Clock

## Wall clock and monotonic time

A clock reads two times: **wall clock time** and **monotonic time**.

The wall clock is what `timestampNow()`, `utcNow()` and `localNow()` read.  
Monotonic time is what `monotonicNow()` reads, and it is what [timers](/guide/timers) and [timings](/guide/timings) run on.

The two often drift apart: NTP corrects the wall clock, a user changes it, a laptop sleeps.

### The three moves: Flow / Snap / Sleep

A clock move comes in three kinds:

- **Flow**: time passes normally, and each timer fires at its own due time.
- **Snap**: the wall clock is set, forward or backward (e.g. an NTP sync, or the user changing the time). The monotonic clock doesn’t move and no timer fires.
- **Sleep**: the system is suspended (e.g. hibernation). On wake-up the wall clock jumps forward, and each overdue timer fires once, in due order.

The wall clock moves in every case. What changes is the monotonic clock and the pending timers:

| `as`             | `monotonic`         | **wall clock** | **monotonic time** | **pending timers**                                                                                 | **backward** |
| ---------------- | ------------------- | -------------- | ------------------ | -------------------------------------------------------------------------------------------------- | ------------ |
| `flow` (default) | `running`           | moves          | moves              | each fires at its due time, in due order, and reads that time                                      | throws       |
| `snap`           | `paused` (default)  | moves          | unchanged          | nothing fires; each keeps the delay it had left                                                    | allowed      |
| `sleep`          | `running` (default) | moves          | moves              | each overdue timer fires once at wake-up, in due order; intervals and recurrences re-arm from then | throws       |
| `sleep`          | `paused`            | moves          | unchanged          | nothing fires (the same as a forward snap)                                                         | throws       |

`monotonic` defaults to `"running"` for `flow` and `sleep`, and to `"paused"`
for `snap`. Only `sleep` accepts both. `flow` with `"paused"` and `snap` with
`"running"` throw.

::: warning Only a snap goes backward  
A negative `flow` or `sleep` throws `A clock can't flow backward. Use { as: "snap" }`.  
Only the wall clock can go back, and that is what `snap` is for.  
_Note: the deprecated
`advance()` still accepts negative values, and moves monotonic time back with
the wall clock._
:::

`sleep` wakes up inside the call: when `moveBy()` returns, the overdue timers
have run.

### Which move matches the host

- Time passing: `flow`.
- A wall-clock correction (NTP, a user changing the time, a timezone database
  update): `snap`.
- A suspend where the host's monotonic clock keeps counting: `sleep`.
- A suspend on Linux: Node.js's `performance.now()` does not count time spent
  suspended there, so after waking the wall clock is ahead and monotonic time
  is not. That is `{ as: "sleep", monotonic: "paused" }`.

## Manual clock

`moveBy()` and `moveTo()` reproduce these moves on a manual clock.  
The `as` option picks the kind.

```ts
timeProvider.clock.moveBy({ seconds: 3 }); // time passes
timeProvider.clock.moveBy({ hours: 8 }, { as: "sleep" }); // the machine slept, then woke up
timeProvider.clock.moveBy({ hours: -1 }, { as: "snap" }); // NTP set the wall clock back
timeProvider.clock.moveTo("2026-03-29T01:00:00.000Z"); // time passes up to that instant
```

`moveBy()` takes the same fields `advance()` did and applies them in the same
order. `moveTo()` takes an ISO string, `EpochMilliseconds` (see
`toInstant()`) or a `TDate`.

### Stepping through timers

Timers are due on monotonic time, so a snap neither fires nor delays them.
`scheduler.timers` reports what is pending:

- `nextDueTime` and `lastDueTime`: the wall time the next and the last pending
  timer fires at, or `undefined`.
- `pendingCount`: the number of pending timers.

A `once()` or `recurring()` timer is not pending while its own callback runs.
An `every()` timer is, already re-armed for its next due time.

`moveTo("nextTimer")` and `moveTo("lastTimer")` flow to those times, and throw
when no timer is pending. `moveUntil("noTimers")` moves from timer to timer
until none is left, including the ones those timers schedule. It takes
`{ as: "flow" }` (the default) or `{ as: "sleep" }`.

`moveUntil()` throws once it has fired 1000 timers
(`DEFAULT_MOVE_UNTIL_TIMERS_LIMIT`). A pending `every()` never runs out, so it
always ends that way. Set another limit on the builder:

```ts
createTimeProvider.for(plugin).asManual().withMoveUntilTimersLimit(50).create();
```

Animation frames and idle callbacks are not timers here. The queries above and
`moveUntil()` skip them, while `moveBy()` and `moveTo()` still fire them.
`scheduler.animation.pendingCount` and `scheduler.idle.pendingCount` count
them, and `scheduler.microtasks.pendingCount` counts queued microtasks.

::: tip Coming from Vitest or sinon fake timers

| Fake timers                                     | Time-Provider                                   |
| ----------------------------------------------- | ----------------------------------------------- |
| `vi.advanceTimersByTime(ms)`, `clock.tick(ms)`  | `moveBy({ milliseconds: ms })`                  |
| `clock.jump(ms)`                                | `moveBy({ milliseconds: ms }, { as: "sleep" })` |
| `vi.setSystemTime(t)`                           | `moveTo(t, { as: "snap" })`                     |
| `vi.advanceTimersToNextTimer()`, `clock.next()` | `moveTo("nextTimer")`                           |
| `clock.runToLast()`                             | `moveTo("lastTimer")`                           |
| `vi.runAllTimers()`, `clock.runAll()`           | `moveUntil("noTimers")`                         |
| `vi.getTimerCount()`                            | `scheduler.timers.pendingCount`                 |

`vi.getTimerCount()` also counts animation frames, idle callbacks and
microtasks. `timers.pendingCount` counts timers only.
:::

## Sequential clock

Each read of a [sequential clock](/guide/sequential-clock) moves it to the
next instant. A backward instant is a snap and a forward one a flow, unless
`withSequentialTime()` says otherwise:

```ts
createTimeProvider
  .for(plugin)
  .asSequential()
  .withSequentialTime("2026-01-01T09:00:00.000Z")
  .withSequentialTime("2026-01-01T17:00:00.000Z", { as: "sleep" })
  .create();
```

A backward instant with `as: "flow"` or `as: "sleep"` throws at `create()`.

## Addons after a step

- [Cron](/addons/cron) follows the wall clock. After a backward step it waits
  for the next occurrence at its wall time and does not run an occurrence
  again. After a forward step it runs the skipped occurrence once, then carries
  on from the current wall time. The step is noticed when the schedule's
  pending timer wakes, so that catch-up run can come as late as the time that
  was left before the step.
- [ETA](/addons/eta) measures `elapsedMilliseconds` and its rate on monotonic
  time. `startTime` and `eta` are wall times.
- [Timings](/guide/timings) measure on monotonic time, so a measure is never
  negative.
