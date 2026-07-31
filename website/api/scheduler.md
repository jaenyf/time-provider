# IScheduler

```ts
type SetTimeoutHandle = ReturnType<typeof setTimeout>;
type SetIntervalHandle = ReturnType<typeof setInterval>;

interface IScheduler {
  setTimeout(callback: () => void, millisecondsDelay?: number): SetTimeoutHandle;
  clearTimeout(handle: SetTimeoutHandle): void;
  setInterval(callback: () => void, millisecondsDelay?: number): SetIntervalHandle;
  clearInterval(handle: SetIntervalHandle): void;
}
```

The same familiar shape as the global `setTimeout`/`setInterval`, scoped to
one `ITimeProvider` instance instead of the process-wide timer queue.
`millisecondsDelay` defaults to `0` (or is clamped to `0` if negative).

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
