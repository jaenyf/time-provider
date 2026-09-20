# Microtasks

`timeProvider.scheduler.microtasks.queue` queues a callback to run at the next
microtask checkpoint, before control returns to the event loop - like the
native `queueMicrotask`, but routed through the strategy's own clock. It's
its own facet under the scheduler (see [IScheduler](/api/scheduler)): a
microtask isn't a scheduled timer, it's not time-driven, and it runs on every
strategy, including a fixed one that never runs a single timer.

- **System** — hands `callback` straight to the host's own microtask queue,
  so it shares one real FIFO queue with promise continuations, exactly like
  calling `queueMicrotask` directly.
- **Manual/sequential/fixed** — `callback` goes on this runtime's own queue
  instead. Since there's no real event loop tick to hang a checkpoint off,
  one runs at every point that stands in for one: after each due timer
  callback, and before any `once`/`every`/`recurring` call, `advance()`, or
  clock read that may run due callbacks. Microtasks aren't time-driven, so a
  fixed clock still runs them even though it never runs a timer.

```ts
timeProvider.scheduler.timers.once({ milliseconds: 0 }, () => {
  log.push("t1");
  timeProvider.scheduler.microtasks.queue(() => log.push("m1"));
});
timeProvider.scheduler.timers.once({ milliseconds: 0 }, () => log.push("t2"));
timeProvider.clock.advance({ milliseconds: 1 });
log; // ["t1", "m1", "t2"] - m1 runs before t2, exactly as a real host would
```

A microtask may itself queue further microtasks; a checkpoint keeps going
until the queue is empty, so a microtask that unconditionally re-queues
itself never lets one finish.

A fixed/manual/sequential runtime additionally exposes `microtasks.drain()`
(see [IMicrotasks](/api/microtasks)), which runs the checkpoint on demand.
The runtime already checkpoints around every due callback and scheduling
call, so this is only needed to observe a microtask queued from your own
code directly — there's no other boundary to hook a drain to:

```ts
timeProvider.scheduler.microtasks.queue(() => log.push("m1"));
log; // [] - nothing has triggered a checkpoint yet
timeProvider.scheduler.microtasks.drain();
log; // ["m1"]
```

Disposing a fixed/manual/sequential Time-Provider discards its still-queued
microtasks along with its timers, so none of them run afterward. A system
Time-Provider can't offer the same guarantee: `callback` is already sitting
on the host's own microtask queue by the time `queue` returns, which has no
notion of the Time-Provider it came through, so it still runs even after
that Time-Provider is disposed.

Try registering timers and microtasks against a manual clock in the
[Playground](/playground) to see the firing order for yourself.
