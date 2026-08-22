# ITimers

```ts
/**
 * Describe a duration in terms of its number of days, hours, minutes, seconds and milliseconds.
 */
export interface IDurationSpec {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
}

type TimerKind = 0 | 1 | 2; // TIMER_KIND_TIMEOUT | TIMER_KIND_INTERVAL | TIMER_KIND_RECURRING

interface ITimerHandle extends IAbortable, IDisposable {
  readonly kind: TimerKind;
}
export interface ITimerOptions {
  /** External cancellation */
  signal?: AbortSignal;
}

interface ITimers {
  /** One-shot timer. */
  once(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle;

  /** A "promise” variant of the `once` one-shot. */
  wait(delay: IDurationSpec, options?: ITimerOptions): Promise<void>;

  /** Fixed-interval timer. */
  every(delay: IDurationSpec, callback: () => void, options?: ITimerOptions): ITimerHandle;

  /** Dynamic-interval timer. The callback itself determines the next interval; `false` stops it. */
  recurring(
    callback: () => IDurationSpec | false,
    initialDelay?: IDurationSpec,
    options?: ITimerOptions,
  ): ITimerHandle;
}
```

On a system runtime these methods use native timers under the hood. The `delay` duration is always clamped to `0`, with
one exception: `every` calls can't repeat faster than once per millisecond. A system one clamps the requested delay to `1` up front, and a
deterministic one accepts `0` — firing immediately, since it is already due
— then re-arms every `1` millisecond, matching what a native interval does
with a delay of `0`.  
_Note: to clear a timer, call `dispose` on the `ITimerHandle` returned by the corresponding timer method._

**When each callback actually runs depends on the clock strategy backing
it** — see [Deterministic Timers](/guide/timers) for the full
breakdown:

- System → asynchronously, on real native timers.
- Manual/Sequential → synchronously, in-line, the moment the callback
  becomes due.
- Fixed → never.

```ts
const handle = timeProvider.timers.every({ seconds: 1 }, () => tick());
// ...
handle.dispose(); // no-op if already fired/cleared
```

## Recurring

`every` repeats on a fixed period; `recurring` repeats on a dynamic period
computed fresh after every run, from `callback`'s own return value:

```ts
let remainingMs = 5 * 60_000;
const handle = timeProvider.timers.recurring(
  () => {
    notifyRemaining(remainingMs);
    if (remainingMs <= 0) return false;
    remainingMs -= 1000;
    return { seconds: 1 };
  },
  { seconds: 1 },
);
// ...
handle.dispose(); // no-op if already fired/cleared
```

`initialDelay` (asap() or { milliseconds: 0 } if omitted or negative) is the initial delay to
the very first run. Every run after that is scheduled from `callback`'s own return value.
