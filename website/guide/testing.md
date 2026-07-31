# Testing With Time-Provider

The pattern across all four strategies: production code depends on
`ITimeProvider<TDate>` (or the narrower `IClock`/`IParser`/`IScheduler`
facets), never on `Date.now()`/`setTimeout` directly. Tests construct the
same object with a different strategy.

```ts
class RetryJob {
  constructor(private readonly timeProvider: ITimeProvider<Date>) {}

  scheduleRetries(times: number, everyMs: number, onRetry: () => void) {
    let count = 0;
    const handle = this.timeProvider.scheduler.setInterval(() => {
      onRetry();
      if (++count >= times) this.timeProvider.scheduler.clearInterval(handle);
    }, everyMs);
  }
}

// test
import { createTimeProvider } from "@time-provider/core/deterministic";
import { plugin } from "@time-provider/plugin-native/deterministic";

const timeProvider = createTimeProvider
  .for(plugin)
  .asManual()
  .withInitialTime("2026-01-01T00:00:00.000Z")
  .create();

const onRetry = vi.fn();
new RetryJob(timeProvider).scheduleRetries(3, 1000, onRetry);

timeProvider.clock.advance({ seconds: 3 });

expect(onRetry).toHaveBeenCalledTimes(3); // no await, no fake-timer setup/teardown
```

## Why this beats global fake timers

- **Scoped, not global.** Only the `ITimeProvider` instance you built is
  fake — any other code touching `Date`/`setTimeout` in the same test
  process is unaffected.
- **No install/restore step.** There's no `jest.useFakeTimers()` /
  `jest.useRealTimers()` pair to remember, and nothing leaks between tests
  if you forget to clean up.
- **Deterministic by construction.** Manual and sequential runs are
  synchronous, so assertions after `advance()` don't need `await` or a
  microtask flush.

## Choosing a strategy for a given test

- Asserting a single timestamp got stamped correctly → [Fixed](/guide/fixed-clock).
- Asserting on retry/backoff/interval behavior over elapsed time → [Manual](/guide/manual-clock).
- Asserting on a sequence of reads from the same code path (e.g. `createdAt` then `updatedAt`) → [Sequential](/guide/sequential-clock).
