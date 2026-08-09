# IScheduler

```ts
type TimerKind = 0 | 1 | 2; // TIMER_KIND_TIMEOUT | TIMER_KIND_INTERVAL | TIMER_KIND_RECURRING

interface DueHandle {
  readonly kind: TimerKind;
}

interface IScheduler {
  setTimeout(callback: () => void, millisecondsDelay?: number): DueHandle;
  clearTimeout(handle: DueHandle): void;
  setInterval(callback: () => void, millisecondsDelay?: number): DueHandle;
  clearInterval(handle: DueHandle): void;
  setRecurring(callback: () => number | false, initialDelay?: number): DueHandle;
  clearRecurring(handle: DueHandle): void;
}
```

The same familiar shape as the global `setTimeout`/`setInterval`, scoped to
one `ITimeProvider` instance instead of the process-wide timer queue.
`millisecondsDelay` defaults to `0` (or is clamped to `0` if negative), with
one exception: no `setInterval` ever repeats faster than once per
millisecond. A system one clamps the requested delay to `1` up front, and a
deterministic one accepts `0` — firing immediately, since it is already due
— then re-arms every `1` millisecond, matching what a native interval does
with a delay of `0`.  
_Note: `DueHandle` is opaque - pass it back to the matching `clear*` method; `kind` is for introspection/debugging, not meant to be branched on._

**When each callback actually runs depends on the clock strategy backing
it** — see [Deterministic Scheduler](/guide/scheduler) for the full
breakdown:

- System → asynchronously, on real native timers.
- Manual/Sequential → synchronously, in-line, the moment the callback
  becomes due.
- Fixed → never.

```ts
const handle = timeProvider.scheduler.setInterval(() => tick(), 1000);
// ...
timeProvider.scheduler.clearInterval(handle); // no-op if already fired/cleared
```

## setRecurring

`setInterval` repeats on a fixed period; `setRecurring` repeats on a period
computed fresh after every run, from `callback`'s own return value:

```ts
let remainingMs = 5 * 60_000;
const handle = timeProvider.scheduler.setRecurring(() => {
  notifyRemaining(remainingMs);
  if (remainingMs <= 0) return false;
  remainingMs -= 1000;
  return 1000;
}, 1000);
```

`initialDelay` (0 if omitted or negative, like `setTimeout`) is the delay to
the very first run. Every run after that is scheduled from `callback`'s own
return value - typically computed from state the run itself just updated (a
counter, remaining time, ...), which is why it's the run itself deciding,
not a separate function evaluated beforehand. Returning `false` stops the
schedule, with no extra trailing run: there's never a next occurrence
already committed by the time `callback` decides against it.  
_Note: any other falsy value (`0` included) still schedules a run - `0` milliseconds out on a system clock, and `1` on a deterministic one, which never re-arms faster than once per millisecond._

`clearRecurring` works the same way - calling it, whether from outside or
reentrantly from within the run itself, always prevents any further run.
The only thing it can't do is undo a run already executing when it's
called, same as any synchronous cancellation.
